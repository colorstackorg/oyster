import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
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
    .orderBy('startDate', 'desc')
    .orderBy('endDate', 'desc')
    .executeTakeFirst();

  if (!education) {
    return;
  }

  const graduationYear = education.endDate.getFullYear().toString();

  await db
    .updateTable('students')
    .set({
      educationLevel:
        EducationLevelFromDegreeType[education.degreeType as DegreeType],
      graduationYear,
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
    airtableId: member.airtableId as string,
    data: {
      graduationYear,
      school: member.school as string,
    },
  });
}
