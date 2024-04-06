import { type Student } from '@oyster/types';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

type UpdateMemberEmailInput = Pick<Student, 'email' | 'id'>;

export async function updateMemberEmail({ email, id }: UpdateMemberEmailInput) {
  const student = await db
    .selectFrom('students')
    .select(['email as previousEmail', 'id'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!student) {
    return new Error('Could not find member.');
  }

  if (email === student.previousEmail) {
    return new Error('This is already the email of this student.');
  }

  const existingEmail = await db
    .selectFrom('studentEmails')
    .where('email', 'ilike', email)
    .where('studentId', '!=', student.id)
    .executeTakeFirst();

  if (existingEmail) {
    return new Error('This emails belongs to another member.');
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('studentEmails')
      .values({
        email,
        studentId: student.id,
      })
      .execute();

    await trx
      .updateTable('students')
      .set({ email })
      .where('id', '=', student.id)
      .execute();

    await trx
      .deleteFrom('studentEmails')
      .where('email', 'ilike', student.previousEmail)
      .execute();
  });

  job('member_email.primary.changed', {
    previousEmail: student.previousEmail,
    studentId: student.id,
  });
}
