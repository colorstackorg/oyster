import { db } from '@oyster/db';

export function getMemberByEmail(email: string) {
  return db
    .selectFrom('students')
    .leftJoin('studentEmails', 'studentEmails.studentId', 'students.id')
    .select(['students.id'])
    .where('studentEmails.email', 'ilike', email)
    .executeTakeFirst();
}
