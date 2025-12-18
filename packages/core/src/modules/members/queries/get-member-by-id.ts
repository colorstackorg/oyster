import { db } from '@oyster/db';

export function getMemberById(id: string) {
  return db
    .selectFrom('students')
    .select(['students.id', 'students.status'])
    .where('students.id', '=', id)
    .executeTakeFirst();
}
