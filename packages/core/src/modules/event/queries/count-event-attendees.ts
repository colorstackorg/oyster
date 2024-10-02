import { db } from '@oyster/db';
import { type EventAttendee } from '@oyster/types';

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
