import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { type ChangePrimaryEmailInput } from '@/modules/member/member.types';

export async function changePrimaryEmail(
  id: string,
  input: ChangePrimaryEmailInput
) {
  const student = await db
    .selectFrom('students')
    .select(['email'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  if (input.email === student.email) {
    throw new Error('This is already your primary email.');
  }

  const studentEmail = await db
    .selectFrom('studentEmails')
    .where('email', 'ilike', input.email)
    .executeTakeFirst();

  if (!studentEmail) {
    throw new Error('The email you are trying to make primary was not found.');
  }

  const previousEmail = student.email;

  await db
    .updateTable('students')
    .set({ email: input.email })
    .where('id', '=', id)
    .execute();

  job('member_email.primary.changed', {
    previousEmail,
    studentId: id,
  });
}
