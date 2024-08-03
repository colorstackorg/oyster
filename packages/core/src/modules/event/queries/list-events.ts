import { type SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';

type ListEventsQuery = Partial<{
  limit: number;
  page: number;
  search: string;
}>;

export async function listEvents<
  Selection extends SelectExpression<DB, 'events'>,
>({ limit = 100, page = 1, search }: ListEventsQuery, selections: Selection[]) {
  const query = db.selectFrom('events').$if(!!search, (qb) => {
    return qb.where('events.name', 'ilike', `%${search}%`);
  });

  const [events, countResult] = await Promise.all([
    query
      .select(selections)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy('events.startTime', 'desc')
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    events,
    totalEvents: parseInt(countResult.count),
  };
}
