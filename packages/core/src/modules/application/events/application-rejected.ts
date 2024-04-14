import dayjs from 'dayjs';

import { iife } from '@oyster/utils';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function onApplicationRejected({
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
