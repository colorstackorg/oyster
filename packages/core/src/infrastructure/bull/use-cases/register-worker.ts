import { Worker, type WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { type z, type ZodType } from 'zod';

import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { ENV } from '@/shared/env';
import { ZodParseError } from '@/shared/errors';
import { type BullQueue } from '../bull.types';

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
  const redis = new Redis(ENV.REDIS_URL as string, {
    family: 0,
    maxRetriesPerRequest: null,
  });

  options = {
    autorun: false,
    connection: redis,
    removeOnComplete: { age: 60 * 60 * 24 * 1, count: 100 },
    removeOnFail: { age: 60 * 60 * 24 * 7, count: 1000 },
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
