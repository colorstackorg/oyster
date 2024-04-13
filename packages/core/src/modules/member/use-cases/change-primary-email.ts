import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { type ChangePrimaryEmailInput } from '@/modules/member/member.types';

/**
 * Changes the primary email of a member. This also emits an event to process
 * the email change in the background (ie: Airtable, Slack).
 *
 * @param id - ID of the member to change the primary email for.
 * @param input - The new primary email (object).
 */
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

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('students')
      .set({ email: input.email })
      .where('id', '=', id)
      .execute();
  });

  job('member_email.primary.changed', {
    previousEmail,
    studentId: id,
  });
}
