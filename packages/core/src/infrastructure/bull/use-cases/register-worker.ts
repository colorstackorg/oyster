import { type Job, QueueEvents, Worker, type WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { type z, type ZodType } from 'zod';

import { reportError } from '@/modules/sentry/use-cases/report-error';
import { ENV } from '@/shared/env';
import { ErrorWithContext, ZodParseError } from '@/shared/errors';
import { type BullQueue } from '../bull.types';

export function registerWorker<Schema extends ZodType>(
  name: BullQueue,
  schema: Schema,
  processor: (job: z.infer<Schema>) => Promise<unknown>,
  options: WorkerOptions = {}
) {
  const redis = new Redis(ENV.REDIS_URL as string, {
    maxRetriesPerRequest: null,
  });

  options = {
    autorun: false,
    connection: redis,
    removeOnComplete: { age: 60 * 60 * 24 * 1 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
    ...options,
  };

  const worker = new Worker(
    name,
    async (input) => {
      const job = validateJob(schema, input);

      return processor(job);
    },
    options
  );

  const queueEvents = new QueueEvents(name, {
    connection: redis,
  });

  queueEvents.on('failed', ({ failedReason, jobId }) => {
    reportError(
      new BullJobFailedError(failedReason).withContext({
        jobId,
      })
    );
  });

  return worker;
}

function validateJob<Schema extends ZodType>(schema: Schema, job: Job) {
  const result = schema.safeParse({
    data: job.data,
    name: job.name,
  });

  if (!result.success) {
    throw new ZodParseError(result.error);
  }

  const data = result.data as z.infer<Schema>;

  return data;
}

class BullJobFailedError extends ErrorWithContext {}
