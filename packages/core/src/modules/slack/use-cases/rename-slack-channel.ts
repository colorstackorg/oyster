import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

export async function renameSlackChannel({
  id,
  name,
}: GetBullJobData<'slack.channel.rename'>) {
  await db
    .updateTable('slackChannels')
    .set({ name })
    .where('id', '=', id)
    .execute();
}
