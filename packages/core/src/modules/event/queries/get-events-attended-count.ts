import { db } from '@/infrastructure/database';

export async function getEventsAttendedCount(memberId: string) {
  const row = await db
    .selectFrom('eventAttendees')
    .select((eb) => eb.fn.count<string>('eventId').as('count'))
    .where('studentId', '=', memberId)
    .executeTakeFirstOrThrow();

  const count = parseInt(row.count);

  return count;
}
