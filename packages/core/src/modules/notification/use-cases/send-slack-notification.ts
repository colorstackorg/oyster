import { internalSlack, slack } from '@/modules/slack/instances';
import { ENV, IS_PRODUCTION } from '@/shared/env';

type SendNotificationInput =
  | {
      channel: string;
      message: string;
      workspace: 'regular';
    }
  | {
      channel?: string;
      message: string;
      workspace: 'internal';
    };

export async function sendSlackNotification(input: SendNotificationInput) {
  if (!IS_PRODUCTION) {
    return;
  }

  const client = input.workspace === 'internal' ? internalSlack : slack;

  const channel = input.channel || ENV.INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID;

  await client.chat.postMessage({
    channel,
    text: input.message,
  });
}
