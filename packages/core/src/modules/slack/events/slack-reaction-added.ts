import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/bull';
import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { ErrorWithContext } from '@/shared/errors';
import { retryWithBackoff } from '@/shared/utils/core.utils';
import { getSlackMessage } from '../services/slack-message.service';

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
  let waiting = false;

  await retryWithBackoff(
    async () => {
      const existingMessage = await db
        .selectFrom('slackMessages')
        .select(['id'])
        .where('channelId', '=', data.channelId)
        .where('id', '=', data.messageId)
        .executeTakeFirst();

      if (existingMessage) {
        return existingMessage;
      }

      if (waiting) {
        return false;
      }

      console.warn('No message found, querying the Slack API...');

      const message = await getSlackMessage({
        channelId: data.channelId,
        messageId: data.messageId,
      });

      if (!message) {
        throw new ErrorWithContext(
          'No message found via Slack API.'
        ).withContext({
          channelId: data.channelId,
          messageId: data.messageId,
        });
      }

      job('slack.message.add', {
        channelId: message.channelId,
        createdAt: message.createdAt,
        id: message.id,
        studentId: message.studentId,
        text: message.text,
        threadId: message.threadId,
        userId: message.userId,
      });

      waiting = true;

      return false;
    },
    { maxRetries: 10, retryInterval: 5000 }
  );
}
