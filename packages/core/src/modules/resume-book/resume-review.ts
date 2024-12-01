import { db } from '@oyster/db';

import { ResumeReviewBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { sendEphemeralSlackNotification } from '@/modules/notification/use-cases/send-ephemeral-slack-notification';
import { ENV } from '@/shared/env';

const targetChannelId = ENV.CAREER_RESUME_REVIEW_CHANNEL_ID;
const resumeReviewUrl = ENV.RESUME_REVIEW_URL;

export const resumeReviewWorker = registerWorker(
  'resume_review',
  ResumeReviewBullJob,
  async (job) => {
    const { channelId, messageId, userId, threadId } = job.data;

    // Check if the message is in the #career-resume-review channel
    if (channelId !== targetChannelId) {
      return;
    }

    // Only check top-level messages, not thread replies
    if (threadId) {
      return;
    }

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
        text: `It looks like you haven't tried out the AI Resume Reviewer before—check it out <${resumeReviewUrl}|here>!`,
        userId: userId,
        threadId: messageId,
      });
    }
  }
);
