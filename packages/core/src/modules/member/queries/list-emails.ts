import { sql } from 'kysely';

import { db } from '@oyster/db';

export async function listEmails(memberId: string) {
  const rows = await db
    .selectFrom('students')
    .leftJoin('studentEmails', 'students.id', 'studentEmails.studentId')
    .select([
      'studentEmails.email',
      sql<boolean>`(student_emails.email = students.email)`.as('primary'),
    ])
    .where('students.id', '=', memberId)
    .execute();

  return rows;
}
