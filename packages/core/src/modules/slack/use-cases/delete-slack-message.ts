import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { retryWithBackoff } from '@/shared/utils/core';

export async function deleteSlackMessage({
  channelId,
  id,
}: GetBullJobData<'slack.message.delete'>) {
  await retryWithBackoff(
    async () => {
      const message = await db
        .deleteFrom('slackMessages')
        .returning(['id', 'studentId', 'threadId'])
        .where('id', '=', id)
        .where('channelId', '=', channelId)
        .executeTakeFirstOrThrow();

      if (message.studentId && message.threadId) {
        job('gamification.activity.completed.undo', {
          channelId,
          studentId: message.studentId,
          threadRepliedTo: message.threadId,
          type: 'reply_to_thread',
        });
      }

      job('slack.thread.sync_embedding', {
        action: 'delete',
        threadId: message.threadId || message.id,
      });

      return true;
    },
    {
      maxRetries: 10,
      retryInterval: 1000,
    }
  );
}
