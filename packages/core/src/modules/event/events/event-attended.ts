import { job } from '@/infrastructure/bull/bull';
import { type GetBullJobData } from '@/infrastructure/bull/bull.types';

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
