import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { redis } from '@/infrastructure/redis';
import { reportException } from '@/infrastructure/sentry';
import { slack } from '@/modules/slack/instances';
import { ErrorWithContext } from '@/shared/errors';
import { getSlackMessage } from '../services/slack-message.service';

// Environment Variables

const SLACK_FEED_CHANNEL_ID = process.env.SLACK_FEED_CHANNEL_ID as string;

// Core

type AddSlackMessageInput = GetBullJobData<'slack.message.add'>;

export async function addSlackMessage(data: AddSlackMessageInput) {
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

  // We don't need to await this since it's not a critical path -- but it does
  // hit the DB and the Slack API, so it has to catch its own rejections.
  // Otherwise it escapes as an unhandled rejection, which is now fatal.
  notifyBusySlackThreadIfNecessary({
    channelId: data.channelId,
    threadId: data.threadId,
  }).catch((e) => reportException(e));

  // We'll do some additional checks for top-level threads...
  if (!data.threadId) {
    const [
      isAutoReplyChannel,
      isCompensationChannel,
      isOpportunityChannel,
      isResumeReviewChannel,
      isSecuredTheBagChannel,
    ] = await Promise.all([
      redis.sismember('slack:auto_reply_channels', data.channelId),
      redis.sismember('slack:compensation_channels', data.channelId),
      redis.sismember('slack:opportunity_channels', data.channelId),
      redis.sismember('slack:resume_review_channels', data.channelId),
      redis.sismember('slack:secured_the_bag_channels', data.channelId),
    ]);

    if (!data.isBot && isAutoReplyChannel) {
      job('slack.question.answer.private', {
        channelId: data.channelId,
        question: data.text as string,
        threadId: data.id,
        userId: data.userId,
      });
    }

    if (!data.isBot && isCompensationChannel) {
      job('offer.share', {
        slackChannelId: data.channelId,
        slackMessageId: data.id,
      });
    }

    if (isOpportunityChannel) {
      job('opportunity.create', {
        slackChannelId: data.channelId,
        slackMessageId: data.id,
      });
    }

    if (data.hasFile && isResumeReviewChannel) {
      job('resume_review.check', {
        userId: data.userId,
      });
    }

    if (isSecuredTheBagChannel) {
      job('slack.secured_the_bag.reminder', {
        channelId: data.channelId,
        messageId: data.id,
        text: data.text as string,
        userId: data.userId,
      });
    }
  }
}

async function ensureThreadExistsIfNecessary(data: AddSlackMessageInput) {
  // Don't need to bother if there is no thread.
  if (!data.threadId) {
    return;
  }

  const existingThread = await db
    .selectFrom('slackMessages')
    .where('id', '=', data.threadId)
    .where('channelId', '=', data.channelId)
    .executeTakeFirst();

  if (existingThread) {
    return;
  }

  console.warn('No thread found, querying the Slack API...');

  const slackThread = await getSlackMessage({
    channelId: data.channelId,
    messageId: data.threadId,
  });

  if (!slackThread) {
    throw new ErrorWithContext('No thread found via Slack API.').withContext({
      channelId: data.channelId,
      messageId: data.id,
      threadId: data.threadId,
    });
  }

  // Add the parent inline rather than enqueueing `slack.message.add` and
  // polling for it -- that job would land behind us in the same queue and
  // couldn't run until we return. This terminates because Slack's `thread_ts`
  // always points at the thread root, and a root has no `threadId` of its own.
  await addSlackMessage(slackThread);
}

/**
 * Sends a notification to the internal team when a thread gets to 100
 * replies. The motivation is that some threads can get a little too spicy
 * and we want to moderate them quickly in case of abuse.
 */
async function notifyBusySlackThreadIfNecessary({
  channelId,
  threadId,
}: Pick<AddSlackMessageInput, 'channelId' | 'threadId'>) {
  // We only need to check the # of replies if this is a reply itself.
  if (!threadId) {
    return;
  }

  const row = await db
    .selectFrom('slackMessages')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('channelId', '=', channelId)
    .where('threadId', '=', threadId)
    .executeTakeFirstOrThrow();

  const count = Number(row.count);

  if (count !== 250 && count !== 500) {
    return;
  }

  const { permalink } = await slack.chat.getPermalink({
    channel: channelId,
    message_ts: threadId,
  });

  if (count === 250) {
    job('notification.slack.send', {
      channel: SLACK_FEED_CHANNEL_ID,
      message: `This <${permalink}|thread> hit 250 replies! 👀`,
      workspace: 'regular',
    });

    return;
  }

  if (count === 500) {
    job('notification.slack.send', {
      message: `This <${permalink}|thread> hit 500 replies! 🚨`,
      workspace: 'internal',
    });

    return;
  }
}
