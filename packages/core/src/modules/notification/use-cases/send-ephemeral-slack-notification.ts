import { isFeatureFlagEnabled } from '@/modules/feature-flag/queries/is-feature-flag-enabled';
import { slack } from '@/modules/slack/instances';

type SendNotificationInput = {
  channel: string;
  text: string;
  threadId?: string;
  userId: string;
};

export async function sendEphemeralSlackNotification({
  channel,
  text,
  threadId,
  userId,
}: SendNotificationInput) {
  const enabled = await isFeatureFlagEnabled('send_slack_messages');

  if (!enabled) {
    return;
  }

  await slack.chat.postEphemeral({
    channel,
    text,
    thread_ts: threadId,
    user: userId,
  });
}
