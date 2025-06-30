import { type JobsOptions, Queue, Worker, type WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { type z, type ZodType } from 'zod';

import {
  BullJob,
  BullQueue,
  type GetBullJobData,
} from '@/infrastructure/bull.types';
import { redis } from '@/infrastructure/redis';
import { reportException } from '@/infrastructure/sentry';
import { ZodParseError } from '@/shared/errors';

// Environment Variables

const REDIS_URL = process.env.REDIS_URL as string;

// Constants

// Instead of instantiating a new queue at the top-level which would produce
// a side-effect, we'll use a global variable to store the queue instances which
// will be created lazily.
const _queues: Record<string, Queue> = {};

// Core

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
    const connection = new Redis(REDIS_URL, {
      family: 0,
      maxRetriesPerRequest: null,
    });

    _queues[name] = new Queue(name, {
      connection,
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
 * Returns whether or not the given queue name is valid queue. As long as it
 * is present in the Redis instance, it is considered valid. Otherwise, it
 * must be present in the `BullQueue` enum.
 *
 * @param name - The name of the queue to validate.
 * @returns `true` if the queue name is valid, `false` otherwise.
 */
export async function isValidQueue(name: string) {
  const actualQueueNames = await listQueueNames();
  const expectedQueueNames = Object.values(BullQueue);

  const valid =
    actualQueueNames.includes(name) ||
    expectedQueueNames.includes(name as BullQueue);

  return valid;
}

export function job<JobName extends BullJob['name']>(
  name: JobName,
  data: GetBullJobData<JobName>,
  options?: JobsOptions
): void {
  const result = BullJob.safeParse({
    data,
    name,
  });

  if (!result.success) {
    reportException(result.error);

    return;
  }

  const job = result.data;

  const queueName = job.name.split('.')[0];
  const queue = getQueue(queueName);

  queue.add(job.name, job.data, options).catch((e) => reportException(e));
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
  const keys = await redis.keys('bull:*:meta');

  const names = keys.map((key) => key.split(':')[1]).sort();

  return names;
}

/**
 * Registers a worker for processing jobs in a Bull queue.
 *
 * This validates the incoming job data against the provided Zod schema before
 * processing. If validation fails, it throws a `ZodParseError`. Any errors are
 * reported to Sentry.
 *
 * @param name - The name of the queue to process.
 * @param schema - Zod schema for validating the job data.
 * @param processor - The function to process each job.
 * @param options - Optional configuration for the worker.
 * @returns A `Worker` instance.
 */
export function registerWorker<Schema extends ZodType>(
  name: BullQueue,
  schema: Schema,
  processor: (job: z.infer<Schema>) => Promise<unknown>,
  options: WorkerOptions = {}
) {
  const redis = new Redis(REDIS_URL, {
    family: 0,
    maxRetriesPerRequest: null,
  });

  options = {
    autorun: false,
    connection: redis,
    removeOnComplete: { age: 60 * 60 * 24 * 1, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24 * 7, count: 10000 },
    ...options,
  };

  const worker = new Worker(
    name,
    async function handle(input) {
      const result = schema.safeParse({
        data: input.data,
        name: input.name,
      });

      if (!result.success) {
        throw new ZodParseError(result.error);
      }

      const job = result.data;

      return processor(job);
    },
    options
  );

  worker.on('failed', (job, error) => {
    reportException(error, {
      jobData: job?.data,
      jobId: job?.id,
      jobName: job?.name,
      queueName: job?.queueName,
    });
  });

  return worker;
}
