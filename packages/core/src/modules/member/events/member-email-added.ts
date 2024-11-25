import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onEmailAdded({
  email,
  studentId,
}: GetBullJobData<'member_email.added'>) {
  job('student.engagement.backfill', {
    email,
    studentId,
  });
}
