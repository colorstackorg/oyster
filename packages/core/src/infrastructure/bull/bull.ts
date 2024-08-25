import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { run } from '@oyster/utils';

import { redis } from '@/infrastructure/redis';
import { ENV } from '@/shared/env';
import { BullQueue } from './bull.types';

export const QueueFromName = run(() => {
  const result = {} as Record<BullQueue, Queue>;

  Object.values(BullQueue).forEach((name) => {
    result[name] = new Queue(name, {
      connection: new Redis(ENV.REDIS_URL, {
        maxRetriesPerRequest: null,
      }),
      defaultJobOptions: {
        attempts: 3,
        backoff: { delay: 5000, type: 'exponential' },
        removeOnComplete: { age: 60 * 60 * 24 * 1, count: 100 },
        removeOnFail: { age: 60 * 60 * 24 * 7, count: 1000 },
      },
    });
  });

  return result;
});

export async function listQueues() {
  const keys = await redis.keys('bull:*:meta');

  const queues = keys.map((key) => {
    return key.split(':')[1];
  });

  return queues.sort();
}

export async function initializeQueue(name: string) {
  const queue = new Queue(name, {
    connection: new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: null,
    }),
    defaultJobOptions: {
      attempts: 3,
      backoff: { delay: 5000, type: 'exponential' },
      removeOnComplete: { age: 60 * 60 * 24 * 1, count: 100 },
      removeOnFail: { age: 60 * 60 * 24 * 7, count: 1000 },
    },
  });

  return queue;
}

export async function isQueue(queue: string) {
  const queues = await listQueues();

  return queues.includes(queue);
}
