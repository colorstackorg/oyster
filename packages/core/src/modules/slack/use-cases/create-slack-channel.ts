import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { joinSlackChannel } from '@/modules/slack/services/slack-channel.service';

export async function createSlackChannel({
  createdAt,
  id,
  name,
  type,
}: GetBullJobData<'slack.channel.create'>) {
  await db
    .insertInto('slackChannels')
    .values({
      createdAt,
      id,
      name,
      type,
    })
    .execute();

  await joinSlackChannel(id);
}
