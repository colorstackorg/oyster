import mailchimp from '@mailchimp/mailchimp_marketing';

import { sleep } from '@oyster/utils';

import { redis, RedisKey } from '@/infrastructure/redis';
import { ENV } from '@/shared/env';

mailchimp.setConfig({
  apiKey: ENV.MAILCHIMP_API_KEY,
  server: ENV.MAILCHIMP_SERVER_PREFIX,
});

/**
 * This is the maximum number of concurrent connections that Mailchimp allows
 * per their API rate limiting documentation.
 *
 * @see https://mailchimp.com/developer/marketing/docs/fundamentals/#throttling
 */
const MAX_MAILCHIMP_CONNECTIONS = 10;

export async function grabMailchimpConnection() {
  while (true) {
    const connections = await redis.incr(RedisKey.MAILCHIMP_CONNECTIONS);

    if (connections <= MAX_MAILCHIMP_CONNECTIONS) {
      return;
    }

    await redis.decr(RedisKey.MAILCHIMP_CONNECTIONS);

    await sleep(1000);
  }
}

export async function releaseMailchimpConnection() {
  await redis.decr(RedisKey.MAILCHIMP_CONNECTIONS);
}
