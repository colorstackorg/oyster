import { sql } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Student } from '@oyster/types';

import { GamificationBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { grantGamificationPoints } from './use-cases/grant-gamification-points';
import { revokeGamificationPoints } from './use-cases/revoke-gamification-points';

// Queries

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

type GetTotalPointsOptions = {
  occurredAfter?: Date | null;
};

export async function getTotalPoints(
  memberId: string,
  options: GetTotalPointsOptions = {}
) {
  const row = await db
    .selectFrom('completedActivities')
    .select((eb) => eb.fn.sum('points').as('points'))
    .where('studentId', '=', memberId)
    .$if(!!options.occurredAfter, (eb) => {
      return eb.where('occurredAt', '>=', options.occurredAfter!);
    })
    .executeTakeFirstOrThrow();

  const points = Number(row.points);

  return points;
}

export async function listActivities() {
  const activities = await db
    .selectFrom('activities')
    .select(['description', 'id', 'name', 'period', 'points', 'type'])
    .where('deletedAt', 'is', null)
    .orderBy('points', 'asc')
    .execute();

  return activities;
}

// Worker

export const gamificationWorker = registerWorker(
  'gamification',
  GamificationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'gamification.activity.completed' }, ({ data }) => {
        return grantGamificationPoints(data);
      })
      .with({ name: 'gamification.activity.completed.undo' }, ({ data }) => {
        return revokeGamificationPoints(data);
      })
      .exhaustive();
  }
);
