import { db } from '@/infrastructure/database';
import { checkMostRecentEducation } from './check-most-recent-education';
import { type Education } from '../education.types';

type EditEducationInput = Pick<
  Education,
  | 'degreeType'
  | 'endDate'
  | 'id'
  | 'major'
  | 'otherMajor'
  | 'otherSchool'
  | 'schoolId'
  | 'startDate'
  | 'studentId'
>;

export async function editEducation({
  degreeType,
  endDate,
  id,
  major,
  otherMajor,
  otherSchool,
  schoolId,
  startDate,
  studentId,
}: EditEducationInput) {
  await db
    .updateTable('educations')
    .set({
      degreeType,
      endDate,
      major,
      otherMajor,
      otherSchool,
      schoolId,
      startDate,
    })
    .where('id', '=', id)
    .where('studentId', '=', studentId)
    .execute();

  checkMostRecentEducation(studentId);
}
