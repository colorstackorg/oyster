import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onEventAttended({
  eventId,
  studentId,
}: GetBullJobData<'event.attended'>) {
  job('student.activation_requirement_completed', {
    requirement: 'attend_event',
    studentId,
  });

  job('gamification.activity.completed', {
    eventId,
    studentId,
    type: 'attend_event',
  });
}
