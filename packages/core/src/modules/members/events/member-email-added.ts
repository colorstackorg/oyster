import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function onEmailAdded({
  email,
  studentId,
}: GetBullJobData<'member_email.added'>) {
  job('student.engagement.backfill', {
    email,
    studentId,
  });
}
