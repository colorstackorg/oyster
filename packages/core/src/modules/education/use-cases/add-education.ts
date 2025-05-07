import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { checkMostRecentEducation } from './check-most-recent-education';
import { type AddEducationInput } from '../education.types';

export async function addEducation(input: AddEducationInput) {
  const educationId = id();

  await db
    .insertInto('educations')
    .values({
      degreeType: input.degreeType,
      endDate: input.endDate,
      id: educationId,
      major: input.major,
      otherMajor: input.otherMajor,
      otherSchool: input.otherSchool,
      schoolId: input.schoolId,
      startDate: input.startDate,
      studentId: input.studentId,
    })
    .execute();

  checkMostRecentEducation(input.studentId);
}
