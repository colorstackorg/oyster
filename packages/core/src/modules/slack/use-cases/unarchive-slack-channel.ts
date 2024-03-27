import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

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
