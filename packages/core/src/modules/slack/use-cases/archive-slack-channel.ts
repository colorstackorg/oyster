import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';

export async function archiveSlackChannel({
  id,
}: GetBullJobData<'slack.channel.archive'>) {
  await db
    .updateTable('slackChannels')
    .set({ deletedAt: new Date() })
    .where('id', '=', id)
    .where('deletedAt', 'is', null)
    .execute();
}
