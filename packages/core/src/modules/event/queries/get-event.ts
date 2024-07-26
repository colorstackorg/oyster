import type { SelectExpression } from 'kysely';

import { type DB } from '@oyster/db';
import { type EventType } from '@oyster/types';

import { db } from '@/infrastructure/database';

type GetEventOptions = {
  include?: 'isCheckedIn'[];
  memberId?: string;
  type?: EventType;
  withIsRegistered?: boolean;
};

export async function getEvent<
  Selection extends SelectExpression<DB, 'events'>,
>(
  id: string,
  selections: Selection[],
  { include, memberId, type, withIsRegistered }: GetEventOptions = {}
) {
  const result = await db
    .selectFrom('events')
    .select(selections)
    .$if(!!withIsRegistered && !!memberId, (qb) => {
      return qb.select((eb) => {
        return eb
          .exists(
            eb
              .selectFrom('eventRegistrations')
              .whereRef('eventRegistrations.eventId', '=', 'events.id')
              .where('eventRegistrations.studentId', '=', memberId!)
          )
          .as('isRegistered');
      });
    })
    .$if(!!include?.includes('isCheckedIn') && !!memberId, (qb) => {
      return qb.select((eb) => {
        return eb
          .exists(
            eb
              .selectFrom('eventAttendees')
              .whereRef('eventAttendees.eventId', '=', 'events.id')
              .where('eventAttendees.studentId', '=', memberId!)
          )
          .as('isCheckedIn');
      });
    })
    .where('events.id', '=', id)
    .$if(!!type, (qb) => {
      return qb.where('events.type', '=', type!);
    })
    .executeTakeFirst();

  return result;
}
