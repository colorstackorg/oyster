import { db } from '@oyster/db';
import { type Student } from '@oyster/types';

import { job } from '@/infrastructure/bull';

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

  if (email.toLowerCase() === student.previousEmail.toLowerCase()) {
    return new Error('This is already the email of this student.');
  }

  const existingEmail = await db
    .selectFrom('studentEmails')
    .select(['email', 'studentId'])
    .where('email', 'ilike', email)
    .executeTakeFirst();

  if (existingEmail && existingEmail.studentId !== student.id) {
    return new Error('This email belongs to another member.');
  }

  // Reuse the stored spelling when promoting an existing secondary email.
  email = existingEmail?.email ?? email;

  await db.transaction().execute(async (trx) => {
    if (!existingEmail) {
      await trx
        .insertInto('studentEmails')
        .values({
          email,
          studentId: student.id,
        })
        .execute();
    }

    await trx
      .updateTable('students')
      .set({ email })
      .where('id', '=', student.id)
      .execute();

    await trx
      .deleteFrom('studentEmails')
      .where('email', 'ilike', student.previousEmail)
      .where('studentId', '=', student.id)
      .execute();
  });

  job('member_email.primary.changed', {
    previousEmail: student.previousEmail,
    studentId: student.id,
  });
}
