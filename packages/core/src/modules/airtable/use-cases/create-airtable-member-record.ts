import { z } from 'zod';

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
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable/airtable.shared';
import { createAirtableRecord } from '@/modules/airtable/use-cases/create-airtable-record';
import { IS_PRODUCTION } from '@/shared/env';

const AirtableMemberRecord = Student.pick({
  email: true,
  firstName: true,
  gender: true,
  id: true,
  lastName: true,
  linkedInUrl: true,
  graduationYear: true,
  otherDemographics: true,
  race: true,
}).extend({
  school: z.string().optional(),
});

type AirtableMemberRecord = z.infer<typeof AirtableMemberRecord>;

export async function createAirtableMemberRecord({
  studentId,
}: GetBullJobData<'airtable.record.create.member'>) {
  if (
    !IS_PRODUCTION ||
    !AIRTABLE_FAMILY_BASE_ID ||
    !AIRTABLE_MEMBERS_TABLE_ID
  ) {
    return;
  }

  const member = await db
    .selectFrom('students')
    .leftJoin('schools', 'schools.id', 'students.schoolId')
    .select([
      'email',
      'firstName',
      'gender',
      'id',
      'lastName',
      'linkedInUrl',
      'graduationYear',
      'otherDemographics',
      'race',
      (eb) => {
        return eb.fn
          .coalesce('schools.name', 'students.otherSchool')
          .as('school');
      },
    ])
    .where('students.id', '=', studentId)
    .executeTakeFirstOrThrow();

  const record = AirtableMemberRecord.parse(member);

  const id = await createAirtableRecord({
    baseId: AIRTABLE_FAMILY_BASE_ID,
    data: {
      'ColorStack ID': studentId,
      Email: record.email,
      'Expected Graduation Year': record.graduationYear.toString(),
      'First Name': record.firstName,
      'Last Name': record.lastName,
      'LinkedIn Profile/URL': record.linkedInUrl,
      'Race & Ethnicity': record.race.map((race) => FORMATTED_RACE[race]),
      Gender: FORMATTED_GENDER[record.gender],
      'Member Type': 'Full Member',
      'Quality of Life': record.otherDemographics.map((demographic) => {
        return FORMATTED_DEMOGRAPHICS[demographic];
      }),
      School: record.school,
    },
    tableName: AIRTABLE_MEMBERS_TABLE_ID,
  });

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('students')
      .set({ airtableId: id })
      .where('id', '=', studentId)
      .execute();
  });
}
