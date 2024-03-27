import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onWorkExperienceAdded({
  studentId,
  workExperienceId: _,
}: GetBullJobData<'work_experience.added'>) {
  job('gamification.activity.completed', {
    studentId,
    type: 'update_work_history',
  });
}
