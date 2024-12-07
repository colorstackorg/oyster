import dedent from 'dedent';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { getChatCompletion } from '@/modules/ai/ai';
import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

export async function sendSecuredTheBagReminder({
  channelId,
  messageId,
  text,
  userId,
}: GetBullJobData<'slack.secured_the_bag.reminder'>): Promise<Result> {
  const result = await isCareerAnnouncement(text);

  if (!result.ok) {
    return fail(result);
  }

  if (!result.data) {
    return success({}); // Exit gracefully.
  }

  const offerDatabaseURL = new URL('/offers', ENV.STUDENT_PROFILE_URL);
  const workHistoryURL = new URL('/profile/work', ENV.STUDENT_PROFILE_URL);

  const { permalink } = await slack.chat.getPermalink({
    channel: channelId,
    message_ts: messageId,
  });

  const message = dedent`
    Congratulations on <${permalink}|securing the bag>! 🎉

    Don't forget to add your offer(s) to the <${offerDatabaseURL}|*offer database*> and update your <${workHistoryURL}|*work history*>! ✅

    Keep up the great work! 🚀
  `;

  job('notification.slack.send', {
    channel: userId,
    message,
    workspace: 'regular',
  });

  return success({});
}

/**
 * Returns true if the input is announcing a new job, offer acceptance, or
 * career milestone.
 */
async function isCareerAnnouncement(text: string): Promise<Result<boolean>> {
  const result = await getChatCompletion({
    maxTokens: 5,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: `Input: ${text}` }],
      },
    ],
    system: [
      {
        cache: true,
        type: 'text',
        text: dedent`
          Determine if the input is announcing a new job, offer acceptance, or career milestone.

          If it is, respond with "true". If it is not, respond with "false".
        `,
      },
    ],
    temperature: 0,
  });

  if (!result.ok) {
    return fail(result);
  }

  return success(result.data === 'true');
}
