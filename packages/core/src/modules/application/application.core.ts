import dayjs from 'dayjs';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { iife } from '@oyster/utils';

import {
  ApplicationBullJob,
  type GetBullJobData,
} from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { reviewApplication } from './use-cases/review-application';

// Worker

export const applicationWorker = registerWorker(
  'application',
  ApplicationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'application.accepted' }, ({ data }) => {
        return onApplicationAccepted(data);
      })
      .with({ name: 'application.created' }, ({ data }) => {
        return onApplicationCreated(data);
      })
      .with({ name: 'application.rejected' }, ({ data }) => {
        return onApplicationRejected(data);
      })
      .with({ name: 'application.review' }, ({ data }) => {
        return reviewApplication(data);
      })
      .exhaustive();
  }
);

async function onApplicationAccepted({
  applicationId,
  studentId,
}: GetBullJobData<'application.accepted'>) {
  const application = await db
    .selectFrom('applications')
    .select(['email', 'firstName'])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  job('student.created', {
    studentId,
  });

  job('notification.email.send', {
    data: { firstName: application.firstName },
    name: 'application-accepted',
    to: application.email,
  });
}

async function onApplicationCreated({
  applicationId,
}: GetBullJobData<'application.created'>) {
  const application = await db
    .selectFrom('applications')
    .select(['email', 'firstName'])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  job('notification.email.send', {
    data: { firstName: application.firstName },
    name: 'application-created',
    to: application.email,
  });

  job('application.review', { applicationId }, { delay: 1000 * 60 * 2.5 });
}

async function onApplicationRejected({
  applicationId,
  automated,
}: GetBullJobData<'application.rejected'>) {
  const application = await db
    .selectFrom('applications')
    .select(['email', 'firstName'])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  job(
    'notification.email.send',
    {
      data: { firstName: application.firstName },
      name: 'application-rejected',
      to: application.email,
    },
    {
      delay: automated
        ? iife(() => {
            const now = dayjs().tz('America/Los_Angeles');
            const tomorrowMorning = now.add(1, 'day').hour(9);
            const delay = tomorrowMorning.diff(now);

            return delay;
          })
        : undefined,
    }
  );
}
