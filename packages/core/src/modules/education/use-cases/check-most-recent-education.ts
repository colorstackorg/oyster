import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable';
import { DegreeType, type EducationLevel } from '../education.types';

const EducationLevelFromDegreeType: Record<DegreeType, EducationLevel> = {
  associate: 'undergraduate',
  bachelors: 'undergraduate',
  certificate: 'bootcamp',
  doctoral: 'phd',
  masters: 'masters',
  professional: 'other',
};

export async function checkMostRecentEducation(studentId: string) {
  const education = await db
    .selectFrom('educations')
    .select([
      'degreeType',
      'endDate',
      'major',
      'otherMajor',
      'otherSchool',
      'schoolId',
    ])
    .where('degreeType', '=', DegreeType.BACHELORS)
    .where('studentId', '=', studentId)
    .orderBy('endDate', 'desc')
    .orderBy('startDate', 'desc')
    .executeTakeFirst();

  if (!education) {
    return;
  }

  let graduationMonth = undefined;
  let graduationYear = undefined;

  if (education.endDate) {
    graduationMonth = education.endDate.getMonth() + 1;
    graduationYear = education.endDate.getFullYear();
  }

  await db
    .updateTable('students')
    .set({
      educationLevel:
        EducationLevelFromDegreeType[education.degreeType as DegreeType],
      graduationMonth,
      graduationYear: graduationYear?.toString(),
      major: education.major,
      otherMajor: education.otherMajor,
      otherSchool: education.otherSchool,
      schoolId: education.schoolId,
    })
    .where('id', '=', studentId)
    .execute();

  const member = await db
    .selectFrom('students')
    .leftJoin('schools', 'schools.id', 'students.schoolId')
    .select([
      'airtableId',
      (eb) => {
        return eb.fn
          .coalesce('schools.name', 'students.otherSchool')
          .as('school');
      },
    ])
    .where('students.id', '=', studentId)
    .executeTakeFirstOrThrow();

  job('airtable.record.update', {
    airtableBaseId: AIRTABLE_FAMILY_BASE_ID!,
    airtableRecordId: member.airtableId as string,
    airtableTableId: AIRTABLE_MEMBERS_TABLE_ID!,
    data: {
      'Expected Graduation Month': graduationMonth?.toString(),
      'Expected Graduation Year': graduationYear?.toString(),
      School: member.school as string,
    },
  });
}
