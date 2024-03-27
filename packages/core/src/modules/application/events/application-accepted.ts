import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function onApplicationAccepted({
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
