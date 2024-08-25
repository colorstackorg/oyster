import { type JobsOptions } from 'bullmq';

import { getQueue } from '@/infrastructure/bull/bull';
import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { BullJob, type GetBullJobData } from '../bull.types';

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
