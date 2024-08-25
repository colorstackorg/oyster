import { Worker, type WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { type z, type ZodType } from 'zod';

import { reportException } from '@/modules/sentry/use-cases/report-exception';
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
    if (error instanceof ErrorWithContext) {
      error.context = {
        ...error.context,
        jobData: job?.data,
        jobId: job?.id,
        jobName: job?.name,
      };
    }

    reportException(error);
  });

  return worker;
}
