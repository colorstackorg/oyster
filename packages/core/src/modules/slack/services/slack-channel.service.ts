import { slack } from '@/modules/slack/instances';
import { RateLimiter } from '@/shared/utils/rate-limiter';

/**
 * @see https://api.slack.com/docs/rate-limits#tier_t3
 */
const joinChannelRateLimiter = new RateLimiter(
  'slack:connections:join_channel',
  {
    rateLimit: 50,
    rateLimitWindow: 60,
  }
);

/**
 * @see https://api.slack.com/methods/conversations.join
 * @see https://api.slack.com/types/conversation
 */
export async function joinSlackChannel(channelId: string) {
  await joinChannelRateLimiter.process();

  await slack.conversations.join({
    channel: channelId,
  });
}
