import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { registerForAirmeetEvent } from '../airmeet-event.service';

export async function registerForEvent({
  eventId,
  studentId,
}: GetBullJobData<'event.register'>) {
  const student = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'lastName'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  await registerForAirmeetEvent({
    email: student.email,
    eventId,
    firstName: student.firstName,
    lastName: student.lastName,
  });

  job('event.registered', {
    eventId,
    studentId,
  });
}
