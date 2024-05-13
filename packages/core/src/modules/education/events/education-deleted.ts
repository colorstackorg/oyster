import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onEducationDeleted({
  educationId: _,
  studentId,
}: GetBullJobData<'education.deleted'>) {
  job('gamification.activity.completed.undo', {
    studentId,
    type: 'update_education_history',
  });
}
