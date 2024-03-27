import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

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
