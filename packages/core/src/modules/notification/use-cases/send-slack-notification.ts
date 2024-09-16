import { isFeatureFlagEnabled } from '@/modules/feature-flag/queries/is-feature-flag-enabled';
import { internalSlack, slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';

type SendNotificationInput =
  | {
      channel: string;
      message: string;
      threadId?: string;
      workspace: 'regular';
    }
  | {
      channel: string;
      ephemeral: true;
      message: string;
      threadId?: string;
      workspace: 'regular';
      userId: string;
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

  const channel = input.channel || ENV.INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID;

  if ('ephemeral' in input && input.ephemeral) {
    await client.chat.postEphemeral({
      channel,
      text: input.message,
      thread_ts: input.threadId,
      user: input.userId,
    });
  } else {
    await client.chat.postMessage({
      channel,
      text: input.message,
      thread_ts: input.threadId,
    });
  }
}
