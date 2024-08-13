import { Redis } from 'ioredis';

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

// Constants

export const ONE_MINUTE_IN_SECONDS = 60;
export const ONE_HOUR_IN_SECONDS = 60 * 60;
export const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
export const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

// Utils

export const cache = {
  async get<T>(key: string) {
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  },

  async set<T>(key: string, data: T, expires?: number) {
    const value = JSON.stringify(data);

    return expires
      ? redis.set(key, value, 'EX', expires)
      : redis.set(key, value);
  },
};

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
  const data = await cache.get<T>(key);

  if (data) {
    return data;
  }

  const result = await fn();

  if (!result) {
    return result;
  }

  await cache.set(key, result, expires || undefined);

  return result;
}
