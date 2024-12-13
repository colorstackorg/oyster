import { db } from '@oyster/db';
import { type EventAttendee } from '@oyster/types';

import { job } from '@/infrastructure/bull';

// Write

type CheckIntoEventInput = {
  eventId: string;
  memberId: string;
};

export async function checkIntoEvent({
  eventId,
  memberId,
}: CheckIntoEventInput) {
  const isNewCheckIn = await db.transaction().execute(async (trx) => {
    const member = await trx
      .selectFrom('students')
      .select(['email', 'firstName', 'lastName'])
      .where('id', '=', memberId)
      .executeTakeFirstOrThrow();

    const record = await trx
      .insertInto('eventAttendees')
      .values({
        email: member.email,
        eventId,
        name: member.firstName + ' ' + member.lastName,
        studentId: memberId,
      })
      .onConflict((oc) => oc.doNothing())
      .executeTakeFirst();

    return !!Number(record.numInsertedOrUpdatedRows);
  });

  if (isNewCheckIn) {
    job('event.attended', {
      eventId,
      studentId: memberId,
    });
  }
}

// Read

type CountEventAttendeesInput = {
  eventId?: string;
  memberId?: string;
};

export async function countEventAttendees({
  eventId,
  memberId,
}: CountEventAttendeesInput) {
  const row = await db
    .selectFrom('eventAttendees')
    .select(({ fn }) => fn.countAll<string>().as('count'))
    .$if(!!eventId, (qb) => {
      return qb.where('eventId', '=', eventId!);
    })
    .$if(!!memberId, (qb) => {
      return qb.where('studentId', '=', memberId!);
    })
    .executeTakeFirstOrThrow();

  const count = parseInt(row.count);

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
      'students.preferredName',
      'students.profilePicture',
    ])
    .where('eventAttendees.eventId', '=', eventId)
    .where('eventAttendees.studentId', 'is not', null)
    .orderBy('eventAttendees.createdAt', 'asc')
    .execute();

  return attendees;
}
