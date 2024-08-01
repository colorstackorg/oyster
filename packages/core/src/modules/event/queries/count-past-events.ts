import { db } from '@oyster/db';

export async function countPastEvents() {
  const result = await db
    .selectFrom('events')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('events.endTime', '<=', new Date())
    .where('events.hidden', '=', false)
    .executeTakeFirstOrThrow();

  const count = parseInt(result.count);

  return count;
}
