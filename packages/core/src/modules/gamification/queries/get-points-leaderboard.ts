import { sql } from 'kysely';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Student } from '@oyster/types';

type GetPointsLeaderboardOptions = {
  limit: number;
  where: {
    memberId: string;
    occurredAfter: Date | null;
    occurredBefore: Date | null;
  };
};

const LeaderboardPosition = Student.pick({
  firstName: true,
  id: true,
  lastName: true,
  profilePicture: true,
}).extend({
  me: z.coerce.boolean(),
  points: z.coerce.number().min(0),
  rank: z.coerce.number().min(1),
});

export async function getPointsLeaderboard({
  limit,
  where,
}: GetPointsLeaderboardOptions) {
  const { memberId, occurredAfter, occurredBefore } = where;

  const rows = await db
    .with('positions', (db) => {
      return db
        .selectFrom('completedActivities')
        .select([(eb) => eb.fn.sum<string>('points').as('points'), 'studentId'])
        .$if(!!occurredAfter, (eb) => {
          return eb.where('occurredAt', '>=', occurredAfter);
        })
        .$if(!!occurredBefore, (eb) => {
          return eb.where('occurredAt', '<=', occurredBefore);
        })
        .groupBy('studentId')
        .orderBy('points', 'desc')
        .limit(limit);
    })
    .selectFrom('positions')
    .leftJoin('students', 'students.id', 'positions.studentId')
    .select([
      'positions.points',
      'students.id',
      'students.firstName',
      'students.lastName',
      'students.profilePicture',
      sql<boolean>`students.id = ${memberId}`.as('me'),
      sql<string>`rank() over (order by positions.points desc)`.as('rank'),
    ])
    .orderBy('points', 'desc')
    .orderBy('createdAt', 'desc')
    .execute();

  const leaderboard = LeaderboardPosition.array().parse(rows);

  return leaderboard;
}
