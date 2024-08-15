import { sql } from 'kysely';

import { db } from '@oyster/db';

import { ONE_HOUR_IN_SECONDS, withCache } from '@/infrastructure/redis';
import { LeaderboardPosition } from '../shared/active-status.shared';

export async function getActiveStreakLeaderboard() {
  const leaderboard = await withCache<LeaderboardPosition[]>(
    'get-active-streak-leaderboard',
    ONE_HOUR_IN_SECONDS * 12,
    async () => {
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

      return positions;
    }
  );

  return leaderboard;
}
