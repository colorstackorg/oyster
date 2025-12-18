import { db } from '@oyster/db';
import { MemberStatus } from '@oyster/types';

export function getMemberByEmail(email: string) {
  return db
    .selectFrom('students')
    .leftJoin('studentEmails', 'studentEmails.studentId', 'students.id')
    .select(['students.id'])
    .where('studentEmails.email', 'ilike', email)
    .where('students.status', '=', MemberStatus.ACTIVE)
    .executeTakeFirst();
}
