import { type z } from 'zod';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
import {
  OneTimeCode,
  OneTimeCodePurpose,
} from '@/modules/authentication/authentication.types';

export const SendEmailCodeInput = OneTimeCode.pick({
  email: true,
});

type SendEmailCodeInput = z.infer<typeof SendEmailCodeInput>;

export async function sendEmailCode(
  studentId: string,
  input: SendEmailCodeInput
) {
  const existingEmail = await db
    .selectFrom('studentEmails')
    .select(['studentId'])
    .where('email', 'ilike', input.email)
    .executeTakeFirst();

  if (existingEmail) {
    throw new Error(
      existingEmail.studentId === studentId
        ? 'This email already belongs to you.'
        : 'The email you are trying to add belongs to another member.'
    );
  }

  const [oneTimeCode, student] = await db.transaction().execute(async (trx) => {
    const oneTimeCode = await trx
      .insertInto('oneTimeCodes')
      .returning(['email', 'id', 'value'])
      .values({
        email: input.email,
        id: id(),
        purpose: OneTimeCodePurpose.ADD_STUDENT_EMAIL,
        value: Math.random().toString().slice(-6),
        studentId,
      })
      .executeTakeFirstOrThrow();

    await trx
      .deleteFrom('oneTimeCodes')
      .where('id', '!=', oneTimeCode.id)
      .where('purpose', '=', OneTimeCodePurpose.ADD_STUDENT_EMAIL)
      .where('studentId', '=', studentId)
      .execute();

    const student = await trx
      .selectFrom('students')
      .select(['firstName'])
      .where('id', '=', studentId)
      .executeTakeFirstOrThrow();

    return [oneTimeCode, student];
  });

  job('notification.email.send', {
    to: oneTimeCode.email,
    name: 'one-time-code-sent',
    data: {
      code: oneTimeCode.value,
      firstName: student.firstName,
    },
  });
}
