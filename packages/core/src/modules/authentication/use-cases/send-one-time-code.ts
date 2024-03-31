import { match } from 'ts-pattern';

import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { sendEmail } from '@/modules/notification/use-cases/send-email';
import type {
  OneTimeCode,
  SendOneTimeCodeInput,
} from '../authentication.types';

export async function sendOneTimeCode({
  email,
  purpose,
}: SendOneTimeCodeInput) {
  const entity = await match(purpose)
    .with('admin_login', () => {
      return db
        .selectFrom('admins')
        .select(['admins.id', 'admins.firstName'])
        .where('admins.email', 'ilike', email)
        .executeTakeFirst();
    })
    .with('student_login', 'add_student_email', () => {
      return db
        .selectFrom('studentEmails')
        .leftJoin('students', 'students.id', 'studentEmails.studentId')
        .select(['students.id', 'students.firstName'])
        .where('studentEmails.email', 'ilike', email)
        .executeTakeFirst();
    })
    .exhaustive();

  if (!entity) {
    throw new Error(
      purpose === 'admin_login'
        ? `There was no admin found with this email (${email}).`
        : `There was no member found with this email (${email}).`
    );
  }

  const entityKey: keyof OneTimeCode = match(purpose)
    .with('admin_login', () => {
      return 'adminId' as const;
    })
    .with('student_login', 'add_student_email', () => {
      return 'studentId' as const;
    })
    .exhaustive();

  const oneTimeCode = await db
    .insertInto('oneTimeCodes')
    .returning(['id', 'value'])
    .values({
      [entityKey]: entity.id,
      email,
      id: id(),
      purpose,
      value: Math.random().toString().slice(-6),
    })
    .executeTakeFirstOrThrow();

  job(
    'one_time_code.expire',
    { oneTimeCodeId: oneTimeCode.id },
    { delay: 1000 * 60 * 10 }
  );

  await sendEmail({
    to: email,
    name: 'one-time-code-sent',
    data: {
      code: oneTimeCode.value,
      firstName: entity.firstName!,
    },
  });

  return {
    id: oneTimeCode.id,
  };
}
