import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';

export async function changeSlackMessage({
  channelId,
  deletedAt,
  id,
  text,
}: GetBullJobData<'slack.message.change'>) {
  await db
    .updateTable('slackMessages')
    .set({ deletedAt, text })
    .where('id', '=', id)
    .where('channelId', '=', channelId)
    .execute();
}
