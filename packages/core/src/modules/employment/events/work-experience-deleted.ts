import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onWorkExperienceDeleted({
  studentId,
  workExperienceId: _,
}: GetBullJobData<'work_experience.deleted'>) {
  job('gamification.activity.completed.undo', {
    studentId,
    type: 'update_work_history',
  });
}
