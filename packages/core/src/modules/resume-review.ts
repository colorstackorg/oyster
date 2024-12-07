import dedent from 'dedent';
import { sql } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db, relativeTime } from '@oyster/db';
import { id } from '@oyster/utils';

import { getChatCompletion } from '@/infrastructure/ai';
import { job, registerWorker } from '@/infrastructure/bull';
import {
  type GetBullJobData,
  ResumeReviewBullJob,
} from '@/infrastructure/bull.types';
import { track } from '@/infrastructure/mixpanel';
import { ENV } from '@/shared/env';
import { ColorStackError } from '@/shared/errors';
import { fail, type Result, success } from '@/shared/utils/core.utils';
import { getTextFromPDF } from '@/shared/utils/file.utils';
import { FileLike } from '@/shared/utils/zod.utils';

// Queries

/**
 * Retrieves the last feedback that the member received on their resume. This
 * feedback is temporarily stored in Redis, not longer-term storage.
 */
export async function getLastResumeFeedback(memberId: string) {
  const review = await db
    .selectFrom('resumeReviews')
    .select('feedback')
    .where('memberId', '=', memberId)
    .where('createdAt', '>=', relativeTime("now() - interval '1 week'"))
    .orderBy('createdAt', 'desc')
    .executeTakeFirst();

  if (!review) {
    return null;
  }

  return review.feedback as ResumeFeedback;
}

// Use Cases

export const ReviewResumeInput = z.object({
  memberId: z.string().trim().min(1),
  resume: FileLike,
});

export type ReviewResumeInput = z.infer<typeof ReviewResumeInput>;

const ResumeBullet = z.object({
  content: z.string(),
  feedback: z.string(),
  rewrites: z.string().array().min(0).max(2),
  score: z.number().min(1).max(10),
});

const ResumeFeedback = z.object({
  experiences: z
    .object({
      bullets: ResumeBullet.array(),
      company: z.string(),
      role: z.string(),
    })
    .array(),

  projects: z
    .object({
      bullets: ResumeBullet.array(),
      title: z.string(),
    })
    .array(),
});

export type ResumeFeedback = z.infer<typeof ResumeFeedback>;

/**
 * Reviews a resume using AI and returns feedback in the form of JSON that
 * adheres to a specific schema. For now, this feedback is focused on the
 * bullet points of the resume.
 *
 * If there is an issue parsing the AI response, it will throw an error.
 *
 * @todo Implement the ability to review the rest of the resume.
 */
export async function reviewResume({
  memberId,
  resume,
}: ReviewResumeInput): Promise<Result<ResumeFeedback>> {
  const systemPrompt = dedent`
    You are the best resume reviewer in the world, specifically for resumes
    aimed at getting a software engineering internship/new grad role.

    Here are your guidelines for a great bullet point:
    - It starts with a strong action verb.
    - It is specific.
    - It talks about achievements.
    - It is concise. No fluff.
    - If possible, it quantifies impact. Don't be as critical about this for
      projects as you are for work experiences. Also, not every single bullet
      point needs to quantify impact, but you should be able to quantify at
      least 1-2 bullet points per experience.

    Here are your guidelines for giving feedback:
    - Be kind.
    - Be specific.
    - Be actionable.
    - Ask questions (ie: "how many...", "how much...", "what was the impact...").
    - Don't be overly nit-picky.
    - If the bullet point is NOT a 10/10, then the last sentence of your
      feedback MUST be an actionable improvement item.

    Here are your guidelines for rewriting bullet points:
    - If the original bullet point is a 10/10, do NOT suggest any rewrites.
    - If the original bullet point is not a 10/10, suggest 1-2 rewrite
      options. Those rewrite options should be at minimum 9/10.
    - Be 1000% certain that the rewrites address all of your feedback. If
      it doesn't, you're not done yet.
    - Use letters (ie: "x") instead of arbitrary numbers.
    - If details about the "what" are missing, you can use placeholders to
      encourage the user to be more specific (ie: "insert xyz here...").
  `;

  const userPrompt = dedent`
    The following is a resume that has been parsed to text from a PDF. Please
    review this resume.

    IMPORTANT: Do not return ANYTHING except for JSON that respects the
    following Zod schema:

    const ResumeBullet = z.object({
      content: z.string(),
      feedback: z.string(),
      rewrites: z.string().array().min(0).max(2),
      score: z.number().min(1).max(10),
    });

    z.object({
      // This should also include leadership experiences.
      experiences: z
        .object({
          bullets: ResumeBullet.array(),
          company: z.string(),
          role: z.string(),
        })
        .array(),

      projects: z
        .object({
          bullets: ResumeBullet.array(),
          title: z.string(),
        })
        .array(),
    });
  `;

  const resumeText = await getTextFromPDF(resume);

  const completionResult = await getChatCompletion({
    maxTokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'text', text: resumeText },
        ],
      },
    ],
    system: [{ type: 'text', text: systemPrompt, cache: true }],
    temperature: 0.25,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  track({
    event: 'Resume Reviewed',
    properties: undefined,
    user: memberId,
  });

  try {
    const object = JSON.parse(completionResult.data);
    const feedback = ResumeFeedback.parse(object);

    await db
      .insertInto('resumeReviews')
      .values({
        feedback: sql`cast(${JSON.stringify(feedback)} as jsonb)`,
        id: id(),
        memberId,
      })
      .execute();

    return success(feedback);
  } catch (e) {
    const error = new ColorStackError()
      .withMessage('Failed to parse the AI response.')
      .withContext({ data: completionResult.data, error: e })
      .report();

    return fail({
      code: 500,
      error: error.message,
    });
  }
}

// Worker

export const resumeReviewWorker = registerWorker(
  'resume_review',
  ResumeReviewBullJob,
  async (job) => {
    const result = await match(job)
      .with({ name: 'resume_review.check' }, ({ data }) => {
        return checkResumeReview(data);
      })
      .exhaustive();

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }
);

async function checkResumeReview({
  userId,
}: GetBullJobData<'resume_review.check'>): Promise<Result> {
  const review = await db
    .selectFrom('resumeReviews')
    .leftJoin('students', 'students.id', 'resumeReviews.memberId')
    .where('students.slackId', '=', userId)
    .executeTakeFirst();

  // If they haven't used the AI Resume Review feature, then we'll send them
  // a notification prompting them to do so.
  if (!review) {
    const url = new URL('/resume/review', ENV.STUDENT_PROFILE_URL);

    job('notification.slack.send', {
      channel: userId,
      message: `If you haven't used the AI Resume Review feature yet, check it out <${url}|*here*>!`,
      workspace: 'regular',
    });
  }

  return success({});
}
