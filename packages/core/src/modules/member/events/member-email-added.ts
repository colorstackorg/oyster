import { job } from '@/infrastructure/bull/bull';
import { type GetBullJobData } from '@/infrastructure/bull/bull.types';

export async function onEmailAdded({
  email,
  studentId,
}: GetBullJobData<'member_email.added'>) {
  job('student.engagement.backfill', {
    email,
    studentId,
  });
}
