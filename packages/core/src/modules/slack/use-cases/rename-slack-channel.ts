import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';

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
