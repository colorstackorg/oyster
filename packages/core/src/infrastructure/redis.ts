import { Redis } from 'ioredis';
import { type z } from 'zod';

import { type ExtractValue } from '@oyster/types';

import { ENV } from '@/shared/env';

// Instances

export const redis = new Redis(ENV.REDIS_URL as string);

// Types

export const RedisKey = {
  AIRMEET_ACCESS_TOKEN: 'airmeet:access_token',
  AIRTABLE_CONNECTIONS: 'airtable:connections',
  CRUNCHBASE_CONNECTIONS: 'crunchbase:connections',
  GOOGLE_GEOCODING_CONNECTIONS: 'google:connections:geocoding',
  MAILCHIMP_CONNECTIONS: 'mailchimp:connections',
  SLACK_DEACTIVATE_CONNECTIONS: 'slack:connections:deactivate',
  SLACK_GET_BIRTHDATES_CONNECTIONS: 'slack:connections:get_birthdates',
  SLACK_GET_MESSAGE_CONNECTIONS: 'slack:connections:get_message',
  SLACK_INVITE_USER_CONNECTIONS: 'slack:connections:invite_user',
  SLACK_JOIN_CHANNEL_CONNECTIONS: 'slack:connections:join_channel',
} as const;

export type RedisKey = ExtractValue<typeof RedisKey>;

// Utils

/**
 * Returns a cache object with `get` and `set` methods.
 *
 * The `get` method will return the cached data if it exists and is valid.
 * Otherwise, it will return `null` and delete the key.
 *
 * The `set` method will store the data in Redis.
 *
 * @param key - Key to store the data in Redis.
 * @param schema - Zod schema to validate any cached data.
 *
 * @deprecated Use `withCache` instead.
 */
export function cache<T>(key: string, schema: z.ZodType<T>) {
  async function get() {
    const stringifiedData = await redis.get(key);

    if (!stringifiedData) {
      return null;
    }

    const data = stringifiedData ? JSON.parse(stringifiedData) : null;

    const result = schema.safeParse(data);

    if (result.success) {
      return result.data;
    }

    await redis.del(key);

    return null;
  }

  async function set(data: T, expires?: number) {
    return expires
      ? redis.set(key, JSON.stringify(data), 'EX', expires)
      : redis.set(key, JSON.stringify(data));
  }

  return {
    get,
    set,
  };
}

/**
 * Returns the cached data if it exists and is valid. Otherwise, it will call
 * the provided function and store the result in Redis. The cache will expire
 * after the provided time.
 *
 * @param key - Key to store the data in Redis.
 * @param expires - Time in seconds for the cache to expire.
 * @param fn - Function to call if the cache is empty.
 */
export async function withCache<T>(
  key: string,
  expires: number | null,
  fn: () => T | Promise<T>
): Promise<T> {
  const data = await redis.get(key);

  if (data) {
    return JSON.parse(data);
  }

  const result = await fn();

  if (!result) {
    return result;
  }

  if (expires) {
    await redis.set(key, JSON.stringify(result), 'EX', expires);
  } else {
    await redis.set(key, JSON.stringify(result));
  }

  return result;
}
