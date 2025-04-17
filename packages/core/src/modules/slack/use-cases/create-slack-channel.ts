import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
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

  job('notification.slack.send', {
    channel: process.env.SLACK_FEED_CHANNEL_ID!,
    message: `🚨 New channel alert! <#${id}>`,
    workspace: 'regular',
  });
}
