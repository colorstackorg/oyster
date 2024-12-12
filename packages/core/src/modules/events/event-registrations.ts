import { db } from '@oyster/db';
import { FORMATTED_GENDER, type Gender } from '@oyster/types';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { registerForAirmeetEvent } from './airmeet';

export async function onRegisteredForEvent({
  eventId,
  studentId,
}: GetBullJobData<'event.registered'>) {
  const [student, event] = await Promise.all([
    db
      .selectFrom('students')
      .select([
        'students.email',
        'students.firstName',
        'students.gender',
        'students.graduationYear',
        'students.lastName',
        'students.number',
      ])
      .where('students.id', '=', studentId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('events')
      .select(['events.name'])
      .where('events.id', '=', eventId)
      .executeTakeFirstOrThrow(),
  ]);

  job('airtable.record.create', {
    airtableBaseId: process.env.AIRTABLE_EVENT_REGISTRATIONS_BASE_ID as string,
    airtableTableId: 'Registrations',
    data: {
      Email: student.email,
      Event: event.name,
      'First Name': student.firstName,
      'Last Name': student.lastName,
      Gender: FORMATTED_GENDER[student.gender as Gender],
      'Graduation Year': student.graduationYear.toString(),
      'Member #': student.number,
      'Registered On': new Date().toISOString(),
    },
  });
}

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
