import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { DeleteWorkExperienceInput } from '../employment.types';

/**
 * Deletes the work experience from the member's history.
 *
 * @param input.id - ID of the work experience to delete.
 * @param input.studentId - ID of the member who owns the work experience.
 */
export async function deleteWorkExperience({
  id,
  studentId,
}: DeleteWorkExperienceInput) {
  await db
    .deleteFrom('workExperiences')
    .where('id', '=', id)
    .where('studentId', '=', studentId)
    .execute();

  job('work_experience.deleted', {
    studentId,
    workExperienceId: id,
  });
}
