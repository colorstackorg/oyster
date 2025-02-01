import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
import { sendEmail } from '@/modules/notifications/use-cases/send-email';
import { IS_DEVELOPMENT } from '@/shared/env';
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
    .with('mentor_login', 'add_mentor_email', () => {
      return db
        .selectFrom('mentors')
        .select(['mentors.id', 'mentors.firstName'])
        .where('mentors.email', 'ilike', email)
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
      match(purpose)
        .with(
          'admin_login',
          () => `There was no admin found with this email (${email}).`
        )
        .with(
          'mentor_login',
          'add_mentor_email',
          () => `There was no mentor found with this email (${email}).`
        )
        .with(
          'student_login',
          'add_student_email',
          () => `There was no member found with this email (${email}).`
        )
        .exhaustive()
    );
  }

  const entityKey: keyof OneTimeCode = match(purpose)
    .with('admin_login', () => 'adminId' as const)
    .with('mentor_login', 'add_mentor_email', () => 'mentorId' as const)
    .with('student_login', 'add_student_email', () => 'studentId' as const)
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

  if (!IS_DEVELOPMENT) {
    await sendEmail({
      to: email,
      name: 'one-time-code-sent',
      data: {
        code: oneTimeCode.value,
        firstName: entity.firstName!,
      },
    });
  }

  return {
    id: oneTimeCode.id,
  };
}
