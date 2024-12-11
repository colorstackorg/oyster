import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function deleteSlackChannel({
  id,
}: GetBullJobData<'slack.channel.delete'>) {
  await db.deleteFrom('slackChannels').where('id', '=', id).execute();
}
