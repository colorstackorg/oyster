import dedent from 'dedent';
import { sql } from 'kysely';
import { ARR, OBJ, parse } from 'partial-json';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db, relativeTime } from '@oyster/db';
import { id } from '@oyster/utils';

import { getChatCompletion, streamChatCompletion } from '@/infrastructure/ai';
import { job, registerWorker } from '@/infrastructure/bull';
import {
  type GetBullJobData,
  ResumeReviewBullJob,
} from '@/infrastructure/bull.types';
import { track } from '@/infrastructure/mixpanel';
import { STUDENT_PROFILE_URL } from '@/shared/env';
import { ColorStackError } from '@/shared/errors';
import { fail, type Result, success } from '@/shared/utils/core';
import { getTextFromPDF } from '@/shared/utils/file';
import { FileLike } from '@/shared/utils/zod';

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

export async function createResumeReview({
  memberId,
  resume,
}: ReviewResumeInput) {
  const resumeText = await getTextFromPDF(resume);

  const review = await db
    .insertInto('resumeReviews')
    .values({
      feedback: sql`cast('{}' as jsonb)`,
      id: id(),
      memberId,
      resumeText,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();

  return review;
}

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
export async function reviewResume(id: string): Promise<ReadableStream> {
  const review = await db
    .selectFrom('resumeReviews')
    .select(['id', 'memberId', 'resumeText'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

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

  const messageStream = await streamChatCompletion({
    maxTokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'text', text: review.resumeText as string },
        ],
      },
    ],
    system: [{ type: 'text', text: systemPrompt, cache: true }],
    temperature: 0.25,
  });

  // const stream = new ReadableStream({
  //   async start(controller) {
  //     // const result: Partial<ResumeFeedback> = {
  //     //   experiences: [],
  //     //   projects: [],
  //     // };

  //     // const text = '';
  //     // let closed = false;

  //     // function close() {
  //     //   if (closed) {
  //     //     console.log('STREAM ALREADY CLOSED');

  //     //     return;
  //     //   }

  //     //   closed = true;
  //     //   console.log('CLOSING STREAM');
  //     //   messageStream.controller.abort();
  //     //   controller.close();
  //     // }

  //     // try {
  //     for await (const chunk of messageStream) {
  //       console.count('HERE');
  //       controller.enqueue('YERRR');
  //     }

  //     // console.count('Stream processing complete');

  //     // const feedback = ResumeFeedback.parse(JSON.parse(text));

  //     // controller.enqueue('event: done\n');
  //     // controller.enqueue(`data: ${JSON.stringify(feedback)}\n\n`);

  //     // await db
  //     //   .updateTable('resumeReviews')
  //     //   .set({ feedback: sql`cast(${JSON.stringify(feedback)} as jsonb)` })
  //     //   .where('id', '=', id)
  //     //   .execute();

  //     // track({
  //     //   event: 'Resume Reviewed',
  //     //   properties: undefined,
  //     //   user: review.memberId as string,
  //     // });

  //     // close();
  //     // }

  //     // catch (e) {
  //     //   const error = new ColorStackError()
  //     //     .withMessage('Failed to parse the AI response.')
  //     //     .withContext({ data: text, error: e })
  //     //     .report();

  //     //   controller.error(error);
  //     // } finally {
  //     //   close();
  //     // }
  //   },
  // });

  const stream = new ReadableStream({
    async start(controller) {
      let result = null;
      let text = '';

      console.count('START');

      for await (const chunk of messageStream) {
        if (chunk.type !== 'content_block_delta') {
          continue;
        }

        if (chunk.delta.type !== 'text_delta') {
          continue;
        }

        text += chunk.delta.text;

        try {
          const json = parse(text, ARR | OBJ);

          if (!json.experiences) {
            json.experiences = [];
          }

          if (!json.projects) {
            json.projects = [];
          }

          const feedback = ResumeFeedback.parse(json);

          if (JSON.stringify(feedback) !== JSON.stringify(result)) {
            controller.enqueue('event: data\n');
            controller.enqueue(`data: ${JSON.stringify(feedback)}\n\n`);
            result = feedback;
          }
        } catch (e) {
          continue;
        }
      }

      console.count('Stream processing complete');

      try {
        const feedback = ResumeFeedback.parse(JSON.parse(text));

        await db
          .updateTable('resumeReviews')
          .set({ feedback: sql`cast(${JSON.stringify(feedback)} as jsonb)` })
          .where('id', '=', id)
          .execute();

        track({
          event: 'Resume Reviewed',
          properties: undefined,
          user: review.memberId as string,
        });
      } catch (e) {
        const error = new ColorStackError()
          .withMessage('Failed to parse the AI response.')
          .withContext({ data: text, error: e })
          .report();

        controller.error(error);
      }
    },
  });

  return stream;
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
    const url = new URL('/resume/review', STUDENT_PROFILE_URL);

    job('notification.slack.send', {
      channel: userId,
      message: `If you haven't used the AI Resume Review feature yet, check it out <${url}|*here*>!`,
      workspace: 'regular',
    });
  }

  return success({});
}
