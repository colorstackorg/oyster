import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function onApplicationCreated({
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
