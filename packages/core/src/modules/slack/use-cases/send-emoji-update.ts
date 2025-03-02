import { type GetBullJobData } from '@/infrastructure/bull.types';
import { isFeatureFlagEnabled } from '@/member-profile.server';
import { slack } from '@/modules/slack/instances';

const CHANNEL_ID = process.env.SLACK_FEED_CHANNEL_ID!;

const buildMessage = (alias: string, value: string) => `\`:${alias}:\` is now available.<${value}|\u200b>`;

type EmojiAddEvent = Extract<GetBullJobData<'slack.emoji.changed'>, { subtype: 'add' }>;

/**
 * Send a message to the Slack channel when a new emoji is added.
 * This handler only processes emoji_changed events with subtype 'add'.
 * For other subtypes ('remove' or 'rename'), the event is ignored.
 * @see SlackEmojiChangedEvent in slack.types.ts for the full event type definition
 */
export async function onSlackEmojiAdded(data: EmojiAddEvent) {
  const enabled = await isFeatureFlagEnabled('slack_emoji_updates');
  if (!enabled) return;

  const message = buildMessage(data.name, data.value);

  return await slack.chat.postMessage({
    channel: CHANNEL_ID,
    text: message,
  });
}


