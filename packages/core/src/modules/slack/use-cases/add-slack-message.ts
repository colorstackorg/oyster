import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { redis } from '@/infrastructure/redis';
import { isFeatureFlagEnabled } from '@/modules/feature-flag/queries/is-feature-flag-enabled';
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

  // We'll do some additional checks for top-level threads...
  if (!data.threadId) {
    const [
      isAutoReplyChannel,
      isOpportunityChannel,
      isJobOfferChannel,
      isJobOffersEnabled,
    ] = await Promise.all([
      redis.sismember('slack:auto_reply_channels', data.channelId),
      redis.sismember('slack:opportunity_channels', data.channelId),
      redis.sismember('slack:job_offer_channels', data.channelId),
      isFeatureFlagEnabled('job_offers'),
    ]);

    if (isAutoReplyChannel) {
      job('slack.question.answer.private', {
        channelId: data.channelId,
        question: data.text as string,
        threadId: data.id,
        userId: data.userId,
      });
    }

    if (isOpportunityChannel) {
      job('opportunity.create', {
        slackChannelId: data.channelId,
        slackMessageId: data.id,
      });
    }

    if (isJobOffersEnabled && isJobOfferChannel) {
      job('job_offer.share', {
        slackChannelId: data.channelId,
        slackMessageId: data.id,
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
