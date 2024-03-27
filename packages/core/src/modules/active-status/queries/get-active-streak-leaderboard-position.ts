import { sql } from 'kysely';

import { db } from '@/infrastructure/database';
import { cache } from '@/infrastructure/redis';
import { LeaderboardPosition } from '../shared/active-status.shared';

export async function getActiveStreakLeaderboardPosition(id: string) {
  const { get, set } = cache(
    `get-active-streak-leaderboard-position:${id}`,
    LeaderboardPosition
  );

  const cachedData = await get();

  if (cachedData !== null) {
    return cachedData;
  }

  const row = await db
    .with('streakGroups', (db) => {
      return db.selectFrom('studentActiveStatuses').select([
        'status',
        'studentId',
        sql<number>`
          row_number() over (partition by student_id order by date desc) -
          row_number() over (partition by student_id, status order by date desc)
        `.as('streakGroup'),
      ]);
    })
    .with('allStreaks', (db) => {
      return db
        .selectFrom('streakGroups')
        .select([
          'studentId',
          (eb) =>
            eb
              .case()
              .when('status', '=', 'active')
              .then(eb.fn.countAll())
              .else(0)
              .end()
              .as('streak'),
        ])
        .where('streakGroup', '=', 0)
        .groupBy(['status', 'studentId']);
    })
    .with('streaks', (db) => {
      return db
        .selectFrom('allStreaks')
        .select([
          'studentId',
          (eb) => eb.fn.max('streak').as('streak'),
          sql<number>`rank() over (order by max(streak) desc)`.as('position'),
        ])
        .groupBy('studentId')
        .orderBy('streak', 'desc');
    })
    .selectFrom('streaks')
    .leftJoin('students', 'students.id', 'streaks.studentId')
    .select([
      'students.id',
      'students.firstName',
      'students.lastName',
      'students.profilePicture',
      'streaks.position',
      'streaks.streak',
    ])
    .where('streaks.studentId', '=', id)
    .orderBy('streak', 'desc')
    .executeTakeFirst();

  const result = LeaderboardPosition.safeParse({
    ...row,
    value: row?.streak,
  });

  if (!result.success) {
    return null;
  }

  set(result.data, 60 * 60 * 6);

  return result.data;
}
