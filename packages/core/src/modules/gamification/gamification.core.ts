import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { sql } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Student } from '@oyster/types';
import { id } from '@oyster/utils';

import {
  GamificationBullJob,
  type GetBullJobData,
} from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import {
  type Activity,
  type ActivityPeriod,
  type CompletedActivity,
  type CreateActivityInput,
  type GrantPointsInput,
} from '@/modules/gamification/gamification.types';
import { IS_PRODUCTION } from '@/shared/env';

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

// Use Cases

export async function addActivity(input: CreateActivityInput) {
  await db
    .insertInto('activities')
    .values({
      description: input.description,
      name: input.name,
      period: input.period,
      points: input.points,
      id: id(),
      type: input.type,
    })
    .execute();
}

export async function archiveActivity(id: string) {
  await db
    .updateTable('activities')
    .set({ deletedAt: new Date() })
    .where('id', '=', id)
    .executeTakeFirst();
}

type EditActivityInput = Pick<
  Activity,
  'description' | 'id' | 'name' | 'period' | 'points' | 'type'
>;

export async function editActivity({
  description,
  id,
  name,
  period,
  points,
  type,
}: EditActivityInput) {
  await db
    .updateTable('activities')
    .set({
      description,
      name,
      period,
      points,
      type,
    })
    .where('id', '=', id)
    .execute();
}

export async function grantPoints({
  description,
  memberId,
  points,
}: GrantPointsInput) {
  job('gamification.activity.completed', {
    description: description,
    points: points,
    studentId: memberId,
    type: 'one_off',
  });
}

// Worker

export const gamificationWorker = registerWorker(
  'gamification',
  GamificationBullJob,
  async (job) => {
    dayjs.extend(quarterOfYear);

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

async function grantGamificationPoints(
  data: GetBullJobData<'gamification.activity.completed'>
) {
  const activityCompleted: Pick<
    CompletedActivity,
    'activityId' | 'id' | 'occurredAt' | 'points' | 'studentId' | 'type'
  > = {
    activityId: null,
    id: id(),
    occurredAt: new Date(),
    points: 0,
    studentId: data.studentId,
    type: data.type,
  };

  // We handle `one_off` events differently b/c it's not linked to an
  // activity in the database.
  if (data.type === 'one_off') {
    activityCompleted.points = data.points;

    await db
      .insertInto('completedActivities')
      .values({
        ...activityCompleted,
        description: data.description,
      })
      .execute();

    queueSlackNotification({
      points: data.points,
      studentId: data.studentId,
    });

    return;
  }

  const activity = await db
    .selectFrom('activities')
    .select(['id', 'period', 'points'])
    .where('type', '=', data.type)
    .executeTakeFirstOrThrow();

  activityCompleted.activityId = activity.id;
  activityCompleted.points = activity.points;

  await match(data)
    .with({ type: 'attend_event' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          eventAttended: input.eventId,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with(
      { type: 'get_activated' },
      { type: 'join_member_directory' },
      { type: 'upload_profile_picture' },
      async () => {
        await db
          .insertInto('completedActivities')
          .values(activityCompleted)
          .onConflict((oc) => oc.doNothing())
          .execute();
      }
    )
    .with({ type: 'get_opportunity_bookmark' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          opportunityBookmarkedBy: input.opportunityBookmarkedBy,
          opportunityId: input.opportunityId,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'get_resource_upvote' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          resourceId: input.resourceId,
          resourceUpvotedBy: input.upvotedBy,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'post_resource' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          resourceId: input.resourceId,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'react_to_message' }, async (input) => {
      const messageReactedTo = await db
        .selectFrom('slackMessages')
        .select(['studentId', 'threadId'])
        .where('id', '=', input.messageReactedTo)
        .where('channelId', '=', input.channelId)
        .executeTakeFirstOrThrow();

      // We won't give points for reactions to thread replies.
      if (messageReactedTo.threadId) {
        return;
      }

      if (IS_PRODUCTION && messageReactedTo.studentId === input.studentId) {
        return;
      }

      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          channelId: input.channelId,
          messageReactedTo: input.messageReactedTo,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'refer_friend' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          referralId: input.referralId,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'reply_to_thread' }, async (input) => {
      const threadRepliedTo = await db
        .selectFrom('slackMessages')
        .select(['studentId'])
        .where('id', '=', input.threadRepliedTo)
        .where('channelId', '=', input.channelId)
        .executeTakeFirstOrThrow();

      if (IS_PRODUCTION && threadRepliedTo.studentId === input.studentId) {
        return;
      }

      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          channelId: input.channelId,
          threadRepliedTo: input.threadRepliedTo,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'review_company' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          workExperienceId: input.workExperienceId,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'submit_census_response' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          censusYear: input.year,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with({ type: 'submit_resume' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          resumeBookId: input.resumeBookId,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    })
    .with(
      { type: 'update_education_history' },
      { type: 'update_work_history' },
      async (input) => {
        const startOfPeriod = match(activity.period as ActivityPeriod)
          .with('quarterly', () => dayjs().startOf('quarter').toDate())
          .exhaustive();

        const endOfPeriod = match(activity.period as ActivityPeriod)
          .with('quarterly', () => dayjs().endOf('quarter').toDate())
          .exhaustive();

        // If the student has already completed this activity this period,
        // we shouldn't give them points.

        const row = await db
          .selectFrom('completedActivities')
          .where('occurredAt', '>=', startOfPeriod)
          .where('occurredAt', '<=', endOfPeriod)
          .where('studentId', '=', input.studentId)
          .where('type', '=', input.type)
          .executeTakeFirst();

        if (row) {
          return;
        }

        await db
          .insertInto('completedActivities')
          .values(activityCompleted)
          .execute();
      }
    )
    .exhaustive();

  queueSlackNotification({
    points: activityCompleted.points,
    studentId: activityCompleted.studentId,
  });
}

async function queueSlackNotification({
  points,
  studentId,
}: Pick<CompletedActivity, 'points' | 'studentId'>) {
  // We'll only send Slack notifications for activities that grant 10 or more
  // points.
  if (points <= 10) {
    return;
  }

  const { slackId } = await db
    .selectFrom('students')
    .select(['slackId'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  if (!slackId) {
    return;
  }

  job('notification.slack.send', {
    channel: slackId,
    message: `You were just awarded *${points} points*! Check your <https://app.colorstack.io/points|*activity history*> to see why! 🎉`,
    workspace: 'regular',
  });
}

async function revokeGamificationPoints(
  data: GetBullJobData<'gamification.activity.completed.undo'>
) {
  const activity = await db
    .selectFrom('activities')
    .select(['id', 'period'])
    .where('type', '=', data.type)
    .executeTakeFirstOrThrow();

  const startOfPeriod = match(activity.period as ActivityPeriod | null)
    .with('quarterly', () => dayjs().startOf('quarter').toDate())
    .with(null, () => null)
    .exhaustive();

  const endOfPeriod = match(activity.period as ActivityPeriod | null)
    .with('quarterly', () => dayjs().endOf('quarter').toDate())
    .with(null, () => null)
    .exhaustive();

  const deleteQuery = db
    .deleteFrom('completedActivities')
    .where('activityId', '=', activity.id)
    .where('studentId', '=', data.studentId);

  await match(data)
    .with({ type: 'get_resource_upvote' }, async (input) => {
      await deleteQuery
        .where('resourceId', '=', input.resourceId)
        .where('resourceUpvotedBy', '=', input.upvotedBy)
        .execute();
    })
    .with({ type: 'react_to_message' }, async (input) => {
      const { count } = await db
        .selectFrom('slackReactions')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('messageId', '=', input.messageReactedTo)
        .where('channelId', '=', input.channelId)
        .where('studentId', '=', input.studentId)
        .executeTakeFirstOrThrow();

      // There's other reactions on the message...so keep the points!
      if (parseInt(count) >= 1) {
        return;
      }

      await deleteQuery
        .where('channelId', '=', input.channelId)
        .where('messageReactedTo', '=', input.messageReactedTo)
        .execute();
    })
    .with({ type: 'reply_to_thread' }, async (input) => {
      const { count } = await db
        .selectFrom('slackMessages')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('threadId', '=', input.threadRepliedTo)
        .where('channelId', '=', input.channelId)
        .where('studentId', '=', input.studentId)
        .executeTakeFirstOrThrow();

      // There's other replies to the thread...so keep the points!
      if (parseInt(count) >= 1) {
        return;
      }

      await deleteQuery
        .where('channelId', '=', input.channelId)
        .where('threadRepliedTo', '=', input.threadRepliedTo)
        .execute();
    })
    .with({ type: 'update_education_history' }, async (input) => {
      // If the student has more than one education history entry in the
      // period, we won't remove the points.

      const { count } = await db
        .selectFrom('educations')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('createdAt', '>=', startOfPeriod!)
        .where('createdAt', '<=', endOfPeriod!)
        .where('studentId', '=', input.studentId)
        .executeTakeFirstOrThrow();

      if (parseInt(count) >= 1) {
        return false;
      }

      await deleteQuery.execute();
    })
    .with({ type: 'update_work_history' }, async (input) => {
      // If the student has more than one work experience entry in the
      // period, we won't remove the points.

      const { count } = await db
        .selectFrom('workExperiences')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('createdAt', '>=', startOfPeriod!)
        .where('createdAt', '<=', endOfPeriod!)
        .where('studentId', '=', input.studentId)
        .executeTakeFirstOrThrow();

      if (parseInt(count) >= 1) {
        return false;
      }

      await deleteQuery.execute();
    })
    .exhaustive();
}
