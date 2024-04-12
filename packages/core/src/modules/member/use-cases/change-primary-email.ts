import { type Transaction } from 'kysely';

import { type DB, db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { type ChangePrimaryEmailInput } from '@/modules/member/member.types';

type ChangePrimaryEmailOptions = {
  trx?: Transaction<DB>;
};

/**
 * Changes the primary email of a member. This also emits an event to process
 * the email change in the background (ie: Airtable, Slack).
 *
 * If an `options.trx` is provided, it will use that transaction to perform the
 * update. Additionally, it will NOT emit the event since we have no way of
 * knowing if the transaction will be committed or rolled back. Instead, this
 * function returns a function to emit the event manually.
 *
 * @param id - ID of the member to change the primary email for.
 * @param input - The new primary email (object).
 * @param options - Options for the operation.
 */
export async function changePrimaryEmail(
  id: string,
  input: ChangePrimaryEmailInput,
  options: ChangePrimaryEmailOptions = {}
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
    trx = options.trx || trx;

    await trx
      .updateTable('students')
      .set({ email: input.email })
      .where('id', '=', id)
      .execute();
  });

  function emit() {
    job('member_email.primary.changed', {
      previousEmail,
      studentId: id,
    });
  }

  if (!options.trx) {
    emit();
  }

  return {
    emit,
  };
}
