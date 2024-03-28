import dayjs from 'dayjs';
import { match } from 'ts-pattern';

import type { ActivityPeriod, CompletedActivity } from '@oyster/types';
import { id } from '@oyster/utils';

import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { IS_PRODUCTION } from '@/shared/env';

export async function grantGamificationPoints(
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
    .with({ type: 'respond_to_survey' }, async (input) => {
      await db
        .insertInto('completedActivities')
        .values({
          ...activityCompleted,
          surveyRespondedTo: input.surveyRespondedTo,
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
  if (points < 10) {
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
