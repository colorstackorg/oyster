import { type GetBullJobData } from '@/infrastructure/bull.types';
import { isFeatureFlagEnabled } from '@/modules/feature-flags/queries/is-feature-flag-enabled';
import { slack } from '@/modules/slack/instances';

type EmojiAddEvent = Extract<
  GetBullJobData<'slack.emoji.changed'>,
  { subtype: 'add' }
>;

/**
 * Send a message to the Slack channel when a new emoji is added.
 * This handler only processes emoji_changed events with subtype 'add'.
 * For other subtypes ('remove' or 'rename'), the event is ignored.
 *
 * @see SlackEmojiChangedEvent in `slack.types.ts` for the full event type definition.
 */
export async function onSlackEmojiAdded(data: EmojiAddEvent) {
  const enabled = await isFeatureFlagEnabled('slack_emoji_updates');

  if (!enabled) {
    return;
  }

  const message = `\`:${data.name}:\` is now available.<${data.value}|\u200b>`;

  return slack.chat.postMessage({
    channel: process.env.SLACK_FEED_CHANNEL_ID!,
    text: message,
  });
}
