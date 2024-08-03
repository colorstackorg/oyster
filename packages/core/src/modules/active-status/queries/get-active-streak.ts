import { sql } from 'kysely';

import { db } from '@oyster/db';

const streakGroup = sql<number>`
  row_number() over (partition by student_id order by date desc) -
  row_number() over (partition by student_id, status order by date desc)
`.as('streakGroup');

export async function getActiveStreak(id: string) {
  const row = await db
    .with('streakGroups', (db) => {
      return db
        .selectFrom('studentActiveStatuses')
        .select(['status', streakGroup])
        .where('studentId', '=', id);
    })
    .with('allStreaks', (db) => {
      return db
        .selectFrom('streakGroups')
        .select([
          (eb) => {
            return eb
              .case()
              .when('status', '=', 'active')
              .then(eb.fn.countAll())
              .else(0)
              .end()
              .as('streak');
          },
        ])
        .where('streakGroup', '=', 0)
        .groupBy(['status']);
    })
    .selectFrom('allStreaks')
    .select([(eb) => eb.fn.max('streak').as('streak')])
    .executeTakeFirst();

  const streak = row ? Number(row.streak) : 0;

  return streak;
}
