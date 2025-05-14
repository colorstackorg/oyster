import { db } from '@oyster/db';
import {
  type EventRegistration,
  FORMATTED_GENDER,
  type Gender,
} from '@oyster/types';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { fail, type Result, success } from '@/shared/utils/core';
import { registerForAirmeetEvent } from './airmeet';

// Use Cases

/**
 * Creates an attendance record for a member in an event. This does NOT
 * actually register the member on Airmeet. Instead, we queue a job called
 * `event.register` that is non-blocking and will register the member on Airmeet.
 */
export async function registerForEvent({
  eventId,
  studentId,
}: Pick<EventRegistration, 'eventId' | 'studentId'>): Promise<Result> {
  const member = await db
    .selectFrom('students')
    .select('email')
    .where('id', '=', studentId)
    .executeTakeFirst();

  if (!member) {
    return fail({
      code: 404,
      error: 'The member trying to register was not found.',
    });
  }

  await db
    .insertInto('eventRegistrations')
    .values({
      email: member.email,
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

  return success({});
}

/**
 * Registers a member for the given event on Airmeet. After the member is
 * registered, a job called `event.registered` is queued to create an Airtable
 * record for the registration.
 */
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
