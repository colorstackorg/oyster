import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { OneTimeCodePurpose } from '@/modules/authentication/authentication.types';
import { type AddEmailInput } from '@/modules/member/member.types';

export async function addEmail(input: AddEmailInput) {
  const existingEmail = await db
    .selectFrom('studentEmails')
    .select(['studentId'])
    .where('email', 'ilike', input.email)
    .executeTakeFirst();

  if (existingEmail) {
    throw new Error(
      existingEmail.studentId === input.studentId
        ? 'This email already belongs to you.'
        : 'The email you are trying to add belongs to another member.'
    );
  }

  const oneTimeCode = await db
    .selectFrom('oneTimeCodes')
    .select('id')
    .where('email', 'ilike', input.email)
    .where('purpose', '=', OneTimeCodePurpose.ADD_STUDENT_EMAIL)
    .where('studentId', '=', input.studentId)
    .where('value', '=', input.code as string)
    .executeTakeFirst();

  if (!oneTimeCode) {
    throw new Error('The code was either wrong or expired. Please try again.');
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('studentEmails')
      .values({
        email: input.email,
        studentId: input.studentId,
      })
      .execute();

    await trx
      .deleteFrom('oneTimeCodes')
      .where('id', '=', oneTimeCode.id)
      .execute();
  });

  job('member_email.added', {
    email: input.email,
    studentId: input.studentId,
  });
}
