import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function changeSlackMessage({
  channelId,
  deletedAt,
  id,
  text,
}: GetBullJobData<'slack.message.change'>) {
  const message = await db
    .updateTable('slackMessages')
    .set({ deletedAt, text })
    .where('id', '=', id)
    .where('channelId', '=', channelId)
    .returning(['id', 'threadId'])
    .executeTakeFirst();

  if (message) {
    job('slack.thread.sync_embedding', {
      action: 'update',
      threadId: message.threadId || message.id,
    });
  }
}
