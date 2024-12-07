import { isFeatureFlagEnabled } from '@/modules/feature-flag/queries/is-feature-flag-enabled';
import { internalSlack, slack } from '@/modules/slack/instances';

const INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID = process.env
  .INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID as string;

type SendNotificationInput =
  | {
      channel: string;
      message: string;
      threadId?: string;
      workspace: 'regular';
    }
  | {
      channel?: string;
      message: string;
      threadId?: string;
      workspace: 'internal';
    };

export async function sendSlackNotification(input: SendNotificationInput) {
  const enabled = await isFeatureFlagEnabled('send_slack_messages');

  if (!enabled) {
    return;
  }

  const client = input.workspace === 'internal' ? internalSlack : slack;

  const channel = input.channel || INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID;

  const { ts } = await client.chat.postMessage({
    channel,
    text: input.message,
    thread_ts: input.threadId,
  });

  return ts;
}
