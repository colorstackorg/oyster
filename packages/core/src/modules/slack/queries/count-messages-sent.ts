import { db } from '@/infrastructure/database';

export async function countMessagesSent(memberId: string) {
  const row = await db
    .selectFrom('slackMessages')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('studentId', '=', memberId)
    .executeTakeFirstOrThrow();

  const count = Number(row.count);

  return count;
}
