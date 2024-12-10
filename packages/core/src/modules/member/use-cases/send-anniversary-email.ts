import { sql } from 'kysely';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function sendAnniversaryEmail(
  _: GetBullJobData<'student.anniversary.email'>
) {
  const yearsDiff = sql<number | string>`
    extract(year from current_date) - extract(year from accepted_at)
  `;

  const members = await db
    .selectFrom('students')
    .select(['email', 'firstName', yearsDiff.as('years')])
    .whereRef(
      sql`(extract(month from accepted_at), extract(day from accepted_at))`,
      '=',
      sql`(extract(month from current_date), extract(day from current_date))`
    )
    // We don't want to send a notification if they joined today before the
    // notification was triggered.
    .where(yearsDiff, '>', 0)
    .execute();

  // We won't send a notification if there are no members with anniversary today!
  if (!members.length) {
    return;
  }

  members.forEach(({ email, firstName, years }) => {
    job('notification.email.send', {
      name: 'student-anniversary',
      data: { firstName, years: Number(years) },
      to: email,
    });
  });
}
