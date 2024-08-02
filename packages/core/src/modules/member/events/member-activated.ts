import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { ENV } from '@/shared/env';

export async function onMemberActivated({
  studentId,
}: GetBullJobData<'student.activated'>) {
  const student = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'id'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  job('gamification.activity.completed', {
    studentId: student.id,
    type: 'get_activated',
  });

  job('notification.email.send', {
    data: {
      firstName: student.firstName,
      studentProfileUrl: ENV.STUDENT_PROFILE_URL,
    },
    name: 'student-activated',
    to: student.email,
  });
}
