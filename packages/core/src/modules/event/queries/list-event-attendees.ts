import { type SelectExpression } from 'kysely';

import { type DB } from '@oyster/db';
import { db } from '@oyster/db';
import { type EventAttendee } from '@oyster/types';

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
