import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onEducationAdded({
  educationId: _,
  studentId,
}: GetBullJobData<'education.added'>) {
  job('gamification.activity.completed', {
    studentId,
    type: 'update_education_history',
  });
}
