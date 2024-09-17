import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { redis } from '@/infrastructure/redis';
import { ErrorWithContext } from '@/shared/errors';
import { retryWithBackoff } from '@/shared/utils/core.utils';
import { getSlackMessage } from '../services/slack-message.service';

export async function addSlackMessage(
  data: GetBullJobData<'slack.message.add'>
) {
  await ensureThreadExistsIfNecessary(data);

  const student = await db
    .selectFrom('students')
    .select(['id'])
    .where('slackId', '=', data.userId)
    .executeTakeFirst();

  await db
    .insertInto('slackMessages')
    .values({
      channelId: data.channelId,
      createdAt: data.createdAt,
      id: data.id,
      studentId: student?.id,
      text: data.text,
      threadId: data.threadId,
      userId: data.userId,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();

  if (student?.id) {
    job('student.activation_requirement_completed', {
      studentId: student.id,
    });

    if (data.threadId) {
      job('gamification.activity.completed', {
        channelId: data.channelId,
        studentId: student.id,
        threadRepliedTo: data.threadId,
        type: 'reply_to_thread',
      });
    }
  }

  job('slack.thread.sync_embedding', {
    action: 'add',
    threadId: data.threadId || data.id,
  });

  // 1. "Is this a thread?"
  // 2. "Is this an auto-reply channel?"
  if (!data.threadId) {
    // We track channels that are "auto-reply" channels in Redis. If a message
    // is sent to one of those channels, we should attempt to answer the
    // question using AI in private (DM).
    const isAutoReplyChannel = await redis.sismember(
      'slack:auto_reply_channels',
      data.channelId
    );

    if (isAutoReplyChannel) {
      job('slack.question.answer.private', {
        channelId: data.channelId,
        question: data.text as string,
        threadId: data.id,
        userId: data.userId,
      });
    }
  }
}

async function ensureThreadExistsIfNecessary(
  data: GetBullJobData<'slack.message.add'>
) {
  // Don't need to bother if there is no thread.
  if (!data.threadId) {
    return;
  }

  let waiting = false;

  await retryWithBackoff(
    async () => {
      const existingThread = await db
        .selectFrom('slackMessages')
        .where('id', '=', data.threadId!)
        .where('channelId', '=', data.channelId)
        .executeTakeFirst();

      if (existingThread) {
        return existingThread;
      }

      if (waiting) {
        return false;
      }

      console.warn('No thread found, querying the Slack API...');

      const slackThread = await getSlackMessage({
        channelId: data.channelId,
        messageId: data.threadId!,
      });

      if (!slackThread) {
        throw new ErrorWithContext(
          'No thread found via Slack API.'
        ).withContext({
          channelId: data.channelId,
          messageId: data.id,
          threadId: data.threadId,
        });
      }

      job('slack.message.add', {
        channelId: slackThread.channelId,
        createdAt: slackThread.createdAt,
        id: slackThread.id,
        studentId: slackThread.studentId,
        text: slackThread.text,
        threadId: slackThread.threadId,
        userId: slackThread.userId,
      });

      waiting = true;

      return false;
    },
    {
      maxRetries: 10,
      retryInterval: 5000,
    }
  );
}
