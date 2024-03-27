import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

export async function deleteSlackChannel({
  id,
}: GetBullJobData<'slack.channel.delete'>) {
  await db.deleteFrom('slackChannels').where('id', '=', id).execute();
}
