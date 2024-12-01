import dedent from 'dedent';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { getChatCompletion } from '@/modules/ai/ai';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

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

export async function sendSecuredTheBagReminder({
  text,
  userId,
}: GetBullJobData<'slack.secured_the_bag.reminder'>) {
  const result = await isCareerAnnouncement(text);

  if (!result.ok || !result.data) {
    return;
  }

  const message = dedent`
    Congratulations on securing the bag! 🎉 
    We noticed your post in the #career-secured-the-bag channel. 
    Don't forget to update your <${ENV.WORK_EXPERIENCE_URL}|*Work History*> on your member profile. 
    Keep up the great work!
  `;

  job('notification.slack.send', {
    channel: userId,
    message,
    workspace: 'regular',
  });
}
