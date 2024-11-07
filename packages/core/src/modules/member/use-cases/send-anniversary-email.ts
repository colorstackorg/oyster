import { sql } from 'kysely';

import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function sendAnniversaryEmail(_: GetBullJobData<'student.anniversary.email'>) {
  const members = await db
  .selectFrom('students')
  .select(['email', 'firstName', 'acceptedAt'])
      .whereRef(
      sql`EXTRACT(MONTH FROM acceptedAt)`,
      '=',
      sql`EXTRACT(MONTH FROM CURRENT_DATE)`
    )
    .whereRef(
      sql`EXTRACT(DAY FROM acceptedAt)`,
      '=',
      sql`EXTRACT(DAY FROM CURRENT_DATE)`
    )
    .where('slackId', 'is not', null)
    .execute();

  // We won't send a notification if there are no members with anniversary today!
  if (!members.length) {
    return;
  }

  for (const member of members) {
    const { email, firstName, acceptedAt } = member;
    const years = Math.floor(
      (new Date().getTime() - new Date(acceptedAt).getTime()) /
        1000 /
        60 /
        60 /
        24 /
        365
    );

    job('notification.email.send', {
      name: 'student-anniversary',
      data: { years, firstName },
      to: email,
    });
  }
}
