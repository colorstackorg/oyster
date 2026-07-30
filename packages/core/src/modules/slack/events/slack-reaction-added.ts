import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { ErrorWithContext } from '@/shared/errors';
import { getSlackMessage } from '../services/slack-message.service';
import { addSlackMessage } from '../use-cases/add-slack-message';

export async function onSlackReactionAdded(
  data: GetBullJobData<'slack.reaction.added'>
) {
  await ensureMessageExists(data);

  const student = await db
    .selectFrom('students')
    .select(['id'])
    .where('slackId', '=', data.userId)
    .executeTakeFirst();

  await db
    .insertInto('slackReactions')
    .values({
      channelId: data.channelId,
      createdAt: new Date(),
      messageId: data.messageId,
      reaction: data.reaction,
      userId: data.userId,
      studentId: student?.id,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();

  if (student) {
    job('gamification.activity.completed', {
      channelId: data.channelId,
      messageReactedTo: data.messageId,
      studentId: student.id,
      type: 'react_to_message',
    });
  }
}

async function ensureMessageExists(
  data: GetBullJobData<'slack.reaction.added'>
) {
  const existingMessage = await db
    .selectFrom('slackMessages')
    .select(['id'])
    .where('channelId', '=', data.channelId)
    .where('id', '=', data.messageId)
    .executeTakeFirst();

  if (existingMessage) {
    return;
  }

  console.warn('No message found, querying the Slack API...');

  const message = await getSlackMessage({
    channelId: data.channelId,
    messageId: data.messageId,
  });

  if (!message) {
    throw new ErrorWithContext('No message found via Slack API.').withContext({
      channelId: data.channelId,
      messageId: data.messageId,
    });
  }

  // Add the message inline rather than enqueueing `slack.message.add` and
  // polling for it. That job would land at the back of the very queue this job
  // is occupying, so it can't run until we return -- we'd burn the full retry
  // window and fail, every time. Worse, the deeper the backlog the longer the
  // wait, so falling behind made every reaction job slower and guaranteed the
  // queue could never catch back up.
  await addSlackMessage(message);
}
