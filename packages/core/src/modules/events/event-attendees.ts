import { type SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';
import { type EventAttendee } from '@oyster/types';

import { job } from '@/infrastructure/bull';

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

type CountEventAttendeesOptions = {
  where: Partial<Pick<EventAttendee, 'eventId' | 'studentId'>>;
};

export async function countEventAttendees(options: CountEventAttendeesOptions) {
  const { where } = options;

  const row = await db
    .selectFrom('eventAttendees')
    .select((eb) => eb.fn.count<string>('eventId').as('count'))
    .$if(!!where.eventId, (qb) => {
      return qb.where('eventId', '=', where.eventId!);
    })
    .$if(!!where.studentId, (qb) => {
      return qb.where('studentId', '=', where.studentId!);
    })
    .executeTakeFirstOrThrow();

  const count = parseInt(row.count);

  return count;
}

type ListEventAttendeesOptions<Selection> = {
  select: Selection[];
  where: Pick<EventAttendee, 'eventId'>;
};

export async function listEventAttendees<
  Selection extends SelectExpression<DB, 'eventAttendees' | 'students'>,
>(options: ListEventAttendeesOptions<Selection>) {
  const { select, where } = options;

  const attendees = await db
    .selectFrom('eventAttendees')
    .leftJoin('students', 'students.id', 'eventAttendees.studentId')
    .select(select)
    .where('eventAttendees.eventId', '=', where.eventId)
    .where('eventAttendees.studentId', 'is not', null)
    .orderBy('eventAttendees.createdAt', 'asc')
    .execute();

  return attendees;
}
