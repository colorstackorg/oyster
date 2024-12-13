import { db } from '@oyster/db';
import { FORMATTED_GENDER, type Gender } from '@oyster/types';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { registerForAirmeetEvent } from './airmeet';

// Use Cases

export async function registerForEvent({
  eventId,
  studentId,
}: {
  eventId: string;
  studentId: string;
}) {
  const student = await db
    .selectFrom('students')
    .select(['email'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  await db
    .insertInto('eventRegistrations')
    .values({
      email: student.email,
      eventId,
      registeredAt: new Date(),
      studentId,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();

  job('event.register', {
    eventId,
    studentId,
  });
}

export async function registerForEventOnAirmeet({
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

// Events

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

// Queries

export async function listEventRegistrations(eventId: string) {
  const registrations = await db
    .selectFrom('eventRegistrations')
    .leftJoin('students', 'students.id', 'eventRegistrations.studentId')
    .select([
      'students.firstName',
      'students.id',
      'students.lastName',
      'students.preferredName',
      'students.profilePicture',
    ])
    .where('eventRegistrations.eventId', '=', eventId)
    .orderBy('eventRegistrations.registeredAt', 'desc')
    .execute();

  return registrations;
}
