import { match } from 'ts-pattern';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { IS_DEVELOPMENT } from '@/shared/env';
import {
  type OneTimeCodePurpose,
  type VerifyOneTimeCodeInput,
} from '../authentication.types';

export async function verifyOneTimeCode({ id, value }: VerifyOneTimeCodeInput) {
  const oneTimeCode = await db
    .selectFrom('oneTimeCodes')
    .select(['adminId', 'mentorId', 'purpose', 'studentId', 'value'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!oneTimeCode) {
    throw new Error('There was no one-time code found. Please start over.');
  }

  if (oneTimeCode.value !== value && !IS_DEVELOPMENT) {
    throw new Error('The one-time code you entered is incorrect.');
  }

  job('one_time_code.expire', {
    oneTimeCodeId: id,
  });

  const userId = match(oneTimeCode.purpose as OneTimeCodePurpose)
    .with('add_student_email', 'student_login', () => {
      return oneTimeCode.studentId as string;
    })
    .with('admin_login', () => {
      return oneTimeCode.adminId as string;
    })
    .with('add_mentor_email', 'mentor_login', () => {
      return oneTimeCode.mentorId as string;
    })
    .exhaustive();

  return {
    userId,
  };
}
