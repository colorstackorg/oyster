import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { ENV } from '@/shared/env';

// We'll use a shared Redis connection for all queue instances.
let _redis: Redis;

// Instead of instantiating a new queue at the top-level which would produce
// a side-effect, we'll use a global variable to store the queue instances which
// will be created lazily.
const _queues: Record<string, Queue> = {};

/**
 * Returns a Bull queue instance for the given name.
 *
 * This function uses a lazy initialization approach to create queue instances
 * only when they are first requested. Subsequent calls with the same name
 * will return the existing queue instance.
 *
 * @param name - The name of the queue to retrieve/create.
 * @returns A Bull queue instance for the specified name.
 */
export function getQueue(name: string) {
  if (!_queues[name]) {
    _queues[name] = new Queue(name, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { delay: 5000, type: 'exponential' },
        removeOnComplete: { age: 60 * 60 * 24 * 1, count: 100 },
        removeOnFail: { age: 60 * 60 * 24 * 7, count: 1000 },
      },
    });
  }

  return _queues[name];
}

/**
 * Lists all the queues currently present in Redis.
 *
 * This function retrieves all keys in Redis that match the pattern
 * `bull:*:meta`, which corresponds to Bull queue metadata. It then extracts
 * and sorts the queue names from these keys.
 *
 * @returns An array of sorted queue names.
 */
export async function listQueueNames() {
  const redis = getRedis();
  const keys = await redis.keys('bull:*:meta');

  const names = keys.map((key) => key.split(':')[1]).sort();

  return names;
}

function getRedis() {
  if (!_redis) {
    _redis = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  return _redis;
}
