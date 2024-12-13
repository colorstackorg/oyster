import { db } from '@oyster/db';
import { type EventAttendee } from '@oyster/types';

import { job } from '@/infrastructure/bull';
import { fail, type Result, success } from '@/shared/utils/core';

// Use Cases

type CheckIntoEventInput = {
  eventId: string;
  memberId: string;
};

/**
 * This checks a member into an IRL event. This feature uses a QR code
 * that is available in the Admin Dashboard. If the attendance record is new,
 * a job is queued to process the event attendance.
 */
export async function checkIntoEvent({
  eventId,
  memberId,
}: CheckIntoEventInput): Promise<Result> {
  const member = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'lastName'])
    .where('id', '=', memberId)
    .executeTakeFirst();

  if (!member) {
    return fail({
      code: 404,
      error: 'The member trying to check in was not found.',
    });
  }

  const { numInsertedOrUpdatedRows } = await db
    .insertInto('eventAttendees')
    .values({
      email: member.email,
      eventId,
      name: member.firstName + ' ' + member.lastName,
      studentId: memberId,
    })
    .onConflict((oc) => oc.doNothing())
    .executeTakeFirst();

  const isNewCheckIn = !!Number(numInsertedOrUpdatedRows || 0);

  if (isNewCheckIn) {
    job('event.attended', {
      eventId,
      studentId: memberId,
    });
  }

  return success({});
}

// Read

export async function countEventAttendees({
  eventId,
  studentId,
}: Partial<Pick<EventAttendee, 'eventId' | 'studentId'>>) {
  const row = await db
    .selectFrom('eventAttendees')
    .select(({ fn }) => fn.countAll<string>().as('count'))
    .$if(!!eventId, (qb) => {
      return qb.where('eventId', '=', eventId!);
    })
    .$if(!!studentId, (qb) => {
      return qb.where('studentId', '=', studentId!);
    })
    .executeTakeFirst();

  const count = Number(row?.count || 0);

  return count;
}

export async function listEventAttendees({
  eventId,
}: Pick<EventAttendee, 'eventId'>) {
  const attendees = await db
    .selectFrom('eventAttendees')
    .leftJoin('students', 'students.id', 'eventAttendees.studentId')
    .select([
      'students.firstName',
      'students.id',
      'students.lastName',
      'students.profilePicture',
    ])
    .where('eventAttendees.eventId', '=', eventId)
    .where('eventAttendees.studentId', 'is not', null)
    .orderBy('eventAttendees.createdAt', 'asc')
    .execute();

  return attendees;
}
