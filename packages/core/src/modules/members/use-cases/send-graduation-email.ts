import { sql } from 'kysely';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { STUDENT_PROFILE_URL } from '@/shared/env';

export async function sendGraduationEmail(
  _: GetBullJobData<'student.graduation.email'>
) {
  const members = await db
    .selectFrom('students')
    .leftJoin('studentEmails', 'students.id', 'studentEmails.studentId')
    .select(['students.email', 'students.firstName'])
    .where(
      'students.graduationYear',
      '=',
      sql<string>`extract(year from current_date)::text`
    )
    .groupBy(['students.id', 'students.email', 'students.firstName'])
    .having(({ fn }) => fn.count('studentEmails.email'), '<', 2)
    .execute();

  // No need to send an email if there are no members who are graduating
  // this year without at least two emails on their account.
  if (!members.length) {
    return;
  }

  const thisYear = new Date().getFullYear();

  members.forEach(({ email, firstName }) => {
    job('notification.email.send', {
      to: email,
      name: 'student-graduation',
      data: {
        firstName,
        graduationYear: thisYear,
        memberProfileUrl: STUDENT_PROFILE_URL,
      },
    });
  });
}
