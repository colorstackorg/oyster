import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/bull';
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

  job('gamification.activity.completed.undo', {
    studentId,
    type: 'update_education_history',
  });
}
