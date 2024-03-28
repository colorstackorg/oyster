import { z } from 'zod';

import {
  FORMATTED_DEMOGRAPHICS,
  FORMATTED_GENDER,
  FORMATTED_RACE,
  Student,
} from '@oyster/types';

import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';
import { IS_PRODUCTION } from '@/shared/env';
import { airtableRateLimiter, getMembersAirtable } from '../airtable.shared';

const AirtableMemberRecord = Student.pick({
  email: true,
  firstName: true,
  gender: true,
  id: true,
  lastName: true,
  graduationYear: true,
  otherDemographics: true,
  race: true,
});

type AirtableMemberRecord = z.infer<typeof AirtableMemberRecord>;

export async function createAirtableMemberRecord({
  studentId,
}: GetBullJobData<'airtable.record.create.member'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  const student = await db
    .selectFrom('students')
    .select([
      'email',
      'firstName',
      'gender',
      'id',
      'lastName',
      'graduationYear',
      'otherDemographics',
      'race',
    ])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  const record = AirtableMemberRecord.parse(student);

  const table = getMembersAirtable();

  await airtableRateLimiter.process();

  await table.create(
    {
      Email: record.email,
      'First Name': record.firstName,
      'Last Name': record.lastName,
      'Expected Graduation Year': record.graduationYear.toString(),
      'Race & Ethnicity': record.race.map((race) => FORMATTED_RACE[race]),
      Gender: FORMATTED_GENDER[record.gender],
      'Member Type': 'Full Member',
      'Quality of Life': record.otherDemographics.map((demographic) => {
        return FORMATTED_DEMOGRAPHICS[demographic];
      }),
    },
    {
      // This means that if there is a select field (whether single or multi),
      // if the value we send to Airtable is not already there, it should
      // create that value instead of failing.
      typecast: true,
    }
  );

  console.log({
    code: 'airtable_record_created',
    message: 'Airtable record was created.',
    data: { studentId: record.id },
  });
}
