import { type z } from 'zod';

import {
  FORMATTED_DEMOGRAPHICS,
  FORMATTED_GENDER,
  FORMATTED_RACE,
  Student,
} from '@oyster/types';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE,
} from '@/modules/airtable/airtable.shared';
import { createAirtableRecord } from '@/modules/airtable/use-cases/create-airtable-record';
import { IS_PRODUCTION } from '@/shared/env';

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
  if (!IS_PRODUCTION || !AIRTABLE_FAMILY_BASE_ID) {
    return;
  }

  const member = await db
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

  const record = AirtableMemberRecord.parse(member);

  await createAirtableRecord({
    baseId: AIRTABLE_FAMILY_BASE_ID,
    data: {
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
    tableName: AIRTABLE_MEMBERS_TABLE,
  });
}
