import dayjs from 'dayjs';
import { match } from 'ts-pattern';

import type { ActivityPeriod } from '@oyster/types';

import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

export async function revokeGamificationPoints(
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
