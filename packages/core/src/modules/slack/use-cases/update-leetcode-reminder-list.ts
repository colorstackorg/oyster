import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function addToLeetcodeList({
  channelId,
  threadId,
  slackId,
}: GetBullJobData<'slack.leetcode.add'>): Promise<void> {
  // Check if user is already in the list
  const existing = await db
    .selectFrom('leetcodeTags')
    .select('slackId')
    .where('slackId', '=', slackId)
    .executeTakeFirst();

  if (existing) {
    job('notification.slack.send', {
      channel: channelId,
      message: "You're already on the daily LeetCode reminder list!",
      threadId: threadId,
      workspace: 'regular',
    });

    return;
  }

  // Add user to leetcodeTags table
  await db
    .insertInto('leetcodeTags')
    .values({
      slackId: slackId,
    })
    .execute();

  // Send confirmation message
  job('notification.slack.send', {
    channel: channelId,
    message: `<@${slackId}> You've been added to the daily LeetCode reminder list! 🎯`,
    threadId: threadId,
    workspace: 'regular',
  });
}

export async function removeFromLeetcodeList({
  channelId,
  threadId,
  slackId,
}: {
  channelId: string;
  threadId: string;
  slackId: string;
}) {
  const existing = await db
    .selectFrom('leetcodeTags')
    .select('slackId')
    .where('slackId', '=', slackId)
    .executeTakeFirst();

  if (existing) {
    // Remove user from leetcodeTags table
    const result = await db
      .deleteFrom('leetcodeTags')
      .where('slackId', '=', slackId)
      .execute();

    // Send confirmation message
    job('notification.slack.send', {
      channel: channelId,
      message:
        result[0]?.numDeletedRows > 0
          ? `<@${slackId}> You've been removed from the daily LeetCode reminder list. Come back anytime! 👋`
          : `<@${slackId}>You weren't on the LeetCode reminder list.`,
      threadId: threadId,
      workspace: 'regular',
    });
  }
}
