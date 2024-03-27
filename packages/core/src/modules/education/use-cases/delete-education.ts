import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { Education } from '../education.types';
import { checkMostRecentEducation } from './check-most-recent-education';

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
