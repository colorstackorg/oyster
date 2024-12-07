import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function unarchiveSlackChannel({
  id,
}: GetBullJobData<'slack.channel.unarchive'>) {
  await db
    .updateTable('slackChannels')
    .set({ deletedAt: null })
    .where('id', '=', id)
    .where('deletedAt', 'is not', null)
    .execute();
}
