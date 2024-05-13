import type { SelectExpression } from 'kysely';

import { type DB } from '@oyster/db';
import { type EventType } from '@oyster/types';

import { db } from '@/infrastructure/database';

type GetEventOptions = {
  memberId?: string;
  type?: EventType;
  withIsRegistered?: boolean;
};

export async function getEvent<
  Selection extends SelectExpression<DB, 'events'>,
>(id: string, selections: Selection[], options: GetEventOptions = {}) {
  const result = await db
    .selectFrom('events')
    .select(selections)
    .$if(!!options.withIsRegistered && !!options.memberId, (qb) => {
      return qb.select((eb) => {
        return eb
          .exists(
            eb
              .selectFrom('eventRegistrations')
              .whereRef('eventRegistrations.eventId', '=', 'events.id')
              .where('eventRegistrations.studentId', '=', options.memberId!)
          )
          .as('isRegistered');
      });
    })
    .where('events.id', '=', id)
    .$if(!!options.type, (qb) => {
      return qb.where('events.type', '=', options.type!);
    })
    .executeTakeFirst();

  return result;
}
