import { sql } from 'kysely';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Email } from '@oyster/types';

const EmailResult = z.object({
  email: Email,
  primary: z.boolean(),
});

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

  const emails = EmailResult.array().parse(rows);

  return emails;
}
