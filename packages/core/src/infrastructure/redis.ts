import { Redis } from 'ioredis';
import { z } from 'zod';

import { ExtractValue } from '@oyster/types';

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
  SLACK_GET_MESSAGE_CONNECTIONS: 'slack:connections:get_message',
  SLACK_INVITE_USER_CONNECTIONS: 'slack:connections:invite_user',
  SLACK_JOIN_CHANNEL_CONNECTIONS: 'slack:connections:join_channel',
  SLACK_LEGACY_COOKIE: 'slack:legacy_cookie',
  SLACK_LEGACY_TOKEN: 'slack:legacy_token',
  SWAG_UP_ACCESS_TOKEN: 'swag_up:access_token',
  SWAG_UP_BOTTLE_PRODUCT_ID: 'swag_up:bottle_product_id',
  SWAG_UP_HAT_PRODUCT_ID: 'swag_up:hat_product_id',
  SWAG_UP_REFRESH_TOKEN: 'swag_up:refresh_token',
  SWAG_UP_SIZE_ID: 'swag_up:size_id',
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
