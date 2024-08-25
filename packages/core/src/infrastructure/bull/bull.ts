import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { ENV } from '@/shared/env';
import { type BullQueue } from './bull.types';

const redis = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const QUEUE_INSTANCES: Record<string, Queue> = {};

export function getQueue(name: BullQueue | (string & {})) {
  if (QUEUE_INSTANCES[name]) {
    return QUEUE_INSTANCES[name];
  }

  const queue = new Queue(name, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { delay: 5000, type: 'exponential' },
      removeOnComplete: { age: 60 * 60 * 24 * 1, count: 100 },
      removeOnFail: { age: 60 * 60 * 24 * 7, count: 1000 },
    },
  });

  QUEUE_INSTANCES[name] = queue;

  return queue;
}

export async function listQueueNames() {
  const keys = await redis.keys('bull:*:meta');

  const names = keys.map((key) => key.split(':')[1]).sort();

  return names;
}
