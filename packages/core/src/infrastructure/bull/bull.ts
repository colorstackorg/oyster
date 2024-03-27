import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { iife } from '@colorstack/utils';

import { ENV } from '@/shared/env';
import { BullQueue } from './bull.types';

export const QueueFromName = iife(() => {
  const result = {} as Record<BullQueue, Queue>;

  Object.values(BullQueue).forEach((name) => {
    result[name] = new Queue(name, {
      connection: new Redis(ENV.REDIS_URL as string, {
        maxRetriesPerRequest: null,
      }),
      defaultJobOptions: {
        attempts: 5,
        backoff: { delay: 5000, type: 'exponential' },
        removeOnComplete: { age: 60 * 60 * 24 * 1 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    });
  });

  return result;
});
