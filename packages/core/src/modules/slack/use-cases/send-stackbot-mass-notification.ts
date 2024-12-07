import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/bull';

export async function sendStackBotMassNotification(message: string) {
  const members = await db
    .selectFrom('students')
    .select(['slackId'])
    .where('slackId', 'is not', null)
    .execute();

  members.forEach((member) => {
    job('notification.slack.send', {
      channel: member.slackId as string,
      message: message,
      workspace: 'regular',
    });
  });
}
