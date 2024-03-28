import { EventType } from '@oyster/types';

import { db } from '@/infrastructure/database';

export async function countPastEvents() {
  const result = await db
    .selectFrom('events')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('events.endTime', '<=', new Date())
    .where('events.type', '=', EventType.VIRTUAL)
    .executeTakeFirstOrThrow();

  const count = parseInt(result.count);

  return count;
}
