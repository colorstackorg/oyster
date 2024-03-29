import { db } from '@/infrastructure/database';

export function findMemberByEmail(email: string) {
  return db
    .selectFrom('students')
    .leftJoin('studentEmails', 'studentEmails.studentId', 'students.id')
    .select(['students.id'])
    .where('studentEmails.email', 'ilike', email)
    .executeTakeFirst();
}
