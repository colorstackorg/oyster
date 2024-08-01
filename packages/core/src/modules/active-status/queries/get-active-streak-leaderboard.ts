import { sql } from 'kysely';

import { db } from '@oyster/db';

import { cache } from '@/infrastructure/redis';
import { LeaderboardPosition } from '../shared/active-status.shared';

export async function getActiveStreakLeaderboard() {
  const { get, set } = cache(
    'get-active-streak-leaderboard',
    LeaderboardPosition.array()
  );

  const cachedData = await get();

  if (cachedData !== null) {
    return cachedData;
  }

  const rows = await db
    .with('streakGroups', (db) => {
      return db.selectFrom('studentActiveStatuses').select([
        'date',
        'status',
        'studentId',
        sql<number>`
            row_number() over (partition by student_id order by date desc) -
            row_number() over (partition by student_id, status order by date desc)
          `.as('streakGroup'),
      ]);
    })
    .with('streaks', (db) => {
      return db
        .selectFrom('streakGroups')
        .select([
          'studentId',
          (eb) => eb.fn.countAll().as('streak'),
          sql<number>`rank() over (order by count(*) desc)`.as('position'),
        ])
        .where('streakGroup', '=', 0)
        .where('status', '=', 'active')
        .groupBy(['studentId'])
        .orderBy('streak', 'desc')
        .limit(10);
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
    .orderBy('streak', 'desc')
    .execute();

  const positions = rows.map((row) => {
    return LeaderboardPosition.parse({
      ...row,
      value: row?.streak,
    });
  });

  set(positions, 60 * 60 * 6);

  return positions;
}
