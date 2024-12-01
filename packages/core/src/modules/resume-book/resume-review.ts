import { match } from 'ts-pattern';

import { db } from '@oyster/db';

import {
  type GetBullJobData,
  ResumeReviewBullJob,
} from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { sendEphemeralSlackNotification } from '@/modules/notification/use-cases/send-ephemeral-slack-notification';
import { ENV } from '@/shared/env';

export const resumeReviewWorker = registerWorker(
  'resume_review',
  ResumeReviewBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'resume.review.check' }, ({ data }) => {
        return handleResumeReviewCheck(data);
      })
      .exhaustive();
  }
);

async function handleResumeReviewCheck(
  data: GetBullJobData<'resume.review.check'>
) {
  const { channelId, messageId, userId } = data;

  // Retrieve the member's information
  const member = await db
    .selectFrom('students')
    .selectAll()
    .where('slackId', '=', userId)
    .executeTakeFirst();

  if (!member) {
    return;
  }

  // Check if the member has a resume submission
  const submission = await db
    .selectFrom('resumeBookSubmissions')
    .selectAll()
    .where('memberId', '=', member.id)
    .executeTakeFirst();

  if (!submission) {
    await sendEphemeralSlackNotification({
      channel: channelId,
      text: `It looks like you haven't tried out the AI Resume Reviewer before—check it out <${ENV.RESUME_REVIEW_URL}|here>!`,
      userId: userId,
      threadId: messageId,
    });
  }
}
