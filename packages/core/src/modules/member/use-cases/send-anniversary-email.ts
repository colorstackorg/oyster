import { sql } from 'kysely';

import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function sendAnniversaryEmail(
  _: GetBullJobData<'student.anniversary.email'>
) {
  const members = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'acceptedAt'])
    .whereRef(
      sql`DATE_PART('doy', acceptedAt)`,
      '=',
      sql`DATE_PART('doy', CURRENT_DATE)`
    )
    .where('slackId', 'is not', null)
    .execute();

  // We won't send a notification if there are no members with anniversary today!
  if (!members.length) {
    return;
  }

  for (const member of members) {
    const { email, firstName, acceptedAt } = member;
    const acceptedDate = new Date(acceptedAt);
    const today = new Date();

    const years = today.getFullYear() - acceptedDate.getFullYear();

    job('notification.email.send', {
      name: 'student-anniversary',
      data: { years, firstName },
      to: email,
    });
  }
}
