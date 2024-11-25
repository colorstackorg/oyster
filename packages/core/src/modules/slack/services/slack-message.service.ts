import { type ConversationsHistoryResponse } from '@slack/web-api';

import { slack } from '@/modules/slack/instances';
import { type SlackMessage } from '@/modules/slack/slack.types';
import { RateLimiter } from '@/shared/utils/rate-limiter';

type Message = NonNullable<ConversationsHistoryResponse['messages']>[number] & {
  channel?: string;
};

type GetMessageInput = {
  channelId: string;
  messageId: string;
};

const getMessageRateLimiter = new RateLimiter('slack:connections:get_message', {
  rateLimit: 50,
  rateLimitWindow: 60,
});

/**
 * @see https://api.slack.com/messaging/retrieving#individual_messages
 */
export async function getSlackMessage({
  channelId,
  messageId,
}: GetMessageInput) {
  await getMessageRateLimiter.process();

  const { messages = [] } = await slack.conversations.history({
    channel: channelId,
    inclusive: true,
    latest: messageId,
    limit: 1,
  });

  const message: Message | undefined = messages[0];

  if (!message) {
    return null;
  }

  message.channel ||= channelId;

  return toMessage(message);
}

function toMessage(
  message: Pick<
    Message,
    'channel' | 'reactions' | 'text' | 'thread_ts' | 'ts' | 'user'
  >
): SlackMessage {
  // We only populate the `threadId` if the message is a thread reply. We
  // know if it's a thread reply if the `ts` and `thread_ts` are different.
  const threadId =
    message.ts && message.thread_ts && message.ts !== message.thread_ts
      ? message.thread_ts
      : undefined;

  return {
    channelId: message.channel!,
    createdAt: new Date(Number(message.ts) * 1000),
    id: message.ts!,
    text: message.text!,
    threadId,
    userId: message.user!,
  };
}
