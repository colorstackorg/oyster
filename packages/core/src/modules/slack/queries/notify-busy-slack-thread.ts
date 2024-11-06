import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';

export async function notifyBusySlackThread(threadId: string) {
  const row = await db
    .selectFrom('slackMessages')
    .select((eb) => [eb.fn.countAll<string>().as('count'), 'channelId']) // channelId is needed for the message link
    .where('threadId', '=', threadId)
    .executeTakeFirstOrThrow();

  const count = Number(row.count);

  if (count == 100) {
    const channelId = row.channelId;
    const uri = `https://colorstack-family.slack.com/archives/${channelId}/p${threadId}`;
    const message = `
    🚨 Uh-oh! Thread <${uri}|#${threadId}> has gone over 💯 replies!
    Better see what's going on. 👀
  `;

    job('notification.slack.send', {
      message: message,
      workspace: 'internal',
    });
  }
}
