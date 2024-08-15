import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { splitArray } from '@oyster/utils';

import { StudentBullJob } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { backfillActiveStatuses } from '@/modules/active-status/use-cases/backfill-active-statuses';
import { createNewActiveStatuses } from '@/modules/active-status/use-cases/create-new-active-statuses';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable/airtable.core';
import { success } from '@/shared/utils/core.utils';
import { onActivationStepCompleted } from './events/activation-step-completed';
import { onMemberActivated } from './events/member-activated';
import { onMemberCreated } from './events/member-created';
import { onMemberRemoved } from './events/member-removed';
import { backfillEngagementRecords } from './use-cases/backfill-engagement-records';
import { sendBirthdayNotification } from './use-cases/send-birthday-notification';
import { viewMemberProfile } from './use-cases/view-member-profile';

export const memberWorker = registerWorker(
  'student',
  StudentBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'student.activated' }, ({ data }) => {
        return onMemberActivated(data);
      })
      .with(
        { name: 'student.activation_requirement_completed' },
        async ({ data }) => {
          return onActivationStepCompleted(data);
        }
      )
      .with({ name: 'student.birthdate.daily' }, ({ data }) => {
        return sendBirthdayNotification(data);
      })
      .with({ name: 'student.created' }, ({ data }) => {
        return onMemberCreated(data);
      })
      .with({ name: 'student.engagement.backfill' }, ({ data }) => {
        return backfillEngagementRecords(data);
      })
      .with({ name: 'student.points.recurring' }, ({ data: _ }) => {
        return updatePointTotals();
      })
      .with({ name: 'student.profile.viewed' }, ({ data }) => {
        return viewMemberProfile(data);
      })
      .with({ name: 'student.removed' }, ({ data }) => {
        return onMemberRemoved(data);
      })
      .with({ name: 'student.statuses.backfill' }, ({ data }) => {
        return backfillActiveStatuses(data);
      })
      .with({ name: 'student.statuses.new' }, ({ data }) => {
        return createNewActiveStatuses(data);
      })
      .exhaustive();
  }
);

/**
 * This is a weekly job that runs and updates the point totals for all members.
 * The query only updates the points for a member if they've actually changed,
 * to avoid unnecessary updates to the database.
 *
 * For any member that has had their points updated, we also update their
 * Airtable record with the new point total.
 */
async function updatePointTotals() {
  const members = await db
    .with('updatedPoints', (db) => {
      return db
        .selectFrom('completedActivities')
        .select(['studentId', (eb) => eb.fn.sum<number>('points').as('points')])
        .groupBy('studentId');
    })
    .updateTable('students')
    .from('updatedPoints')
    .set((eb) => {
      return {
        points: eb.ref('updatedPoints.points'),
      };
    })
    .whereRef('students.id', '=', 'updatedPoints.studentId')
    .whereRef('students.points', '!=', 'updatedPoints.points')
    .returning(['students.airtableId', 'students.id', 'students.points'])
    .execute();

  // The Airtable API only allows us to update 10 records at a time, so we need
  // to chunk the members into smaller groups.
  const memberChunks = splitArray(
    members.filter((member) => !!member.airtableId),
    10
  );

  memberChunks.forEach((members) => {
    job('airtable.record.update.bulk', {
      airtableBaseId: AIRTABLE_FAMILY_BASE_ID as string,
      airtableTableId: AIRTABLE_MEMBERS_TABLE_ID as string,
      records: members.map((member) => {
        return {
          id: member.airtableId as string,
          data: {
            Points: member.points,
          },
        };
      }),
    });
  });

  return success(members.length);
}
