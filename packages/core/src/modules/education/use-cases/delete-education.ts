import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { checkMostRecentEducation } from './check-most-recent-education';
import { type Education } from '../education.types';

type DeleteEducationInput = Pick<Education, 'id' | 'studentId'>;

export async function deleteEducation({ id, studentId }: DeleteEducationInput) {
  await db
    .deleteFrom('educations')
    .where('educations.id', '=', id)
    .where('educations.studentId', '=', studentId)
    .execute();

  checkMostRecentEducation(studentId);

  job('education.deleted', {
    educationId: id,
    studentId,
  });
}
