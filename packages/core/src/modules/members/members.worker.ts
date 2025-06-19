import dayjs from 'dayjs';
import { sql } from 'kysely';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { splitArray } from '@oyster/utils';

import { job, registerWorker } from '@/infrastructure/bull';
import { StudentBullJob } from '@/infrastructure/bull.types';
import { backfillActiveStatuses } from '@/modules/active-statuses/use-cases/backfill-active-statuses';
import { createNewActiveStatuses } from '@/modules/active-statuses/use-cases/create-new-active-statuses';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable';
import { sendCompanyReviewNotifications } from '@/modules/employment/use-cases/send-company-review-notifications';
import { syncLinkedInProfiles } from '@/modules/linkedin';
import { sendAnniversaryEmail } from '@/modules/members/use-cases/send-anniversary-email';
import { sendGraduationEmail } from '@/modules/members/use-cases/send-graduation-email';
import { success } from '@/shared/utils/core';
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
    const result = await match(job)
      .with({ name: 'student.activated' }, ({ data }) => {
        return onMemberActivated(data);
      })
      .with(
        { name: 'student.activation_requirement_completed' },
        async ({ data }) => {
          return onActivationStepCompleted(data);
        }
      )
      .with({ name: 'student.anniversary.email' }, ({ data }) => {
        return sendAnniversaryEmail(data);
      })
      .with({ name: 'student.birthdate.daily' }, ({ data }) => {
        return sendBirthdayNotification(data);
      })
      .with({ name: 'student.company_review_notifications' }, ({ data }) => {
        return sendCompanyReviewNotifications(data);
      })
      .with({ name: 'student.created' }, ({ data }) => {
        return onMemberCreated(data);
      })
      .with({ name: 'student.engagement.backfill' }, ({ data }) => {
        return backfillEngagementRecords(data);
      })
      .with({ name: 'student.graduation.email' }, ({ data }) => {
        return sendGraduationEmail(data);
      })
      .with({ name: 'student.linkedin.sync' }, ({ data }) => {
        return syncLinkedInProfiles(data);
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

    return result;
  }
);

/**
 * This is a weekly job that runs and updates the point totals for all members.
 * We also calculate (but don't store) the points per day and points in the last
 * 90 days.
 *
 * We update all of these values in their respective columns in Airtable.
 */
async function updatePointTotals() {
  const zero = sql<number>`0`;

  const members = await db
    .with('updatedPoints', (db) => {
      return db
        .selectFrom('students')
        .leftJoin(
          'completedActivities',
          'completedActivities.studentId',
          'students.id'
        )
        .select([
          'students.id as studentId',

          (eb) => {
            return eb.fn
              .coalesce(eb.fn.sum<number>('completedActivities.points'), zero)
              .as('pointsAllTime');
          },

          (eb) => {
            const ninetyDaysAgo = dayjs().subtract(90, 'day').toDate();

            const sum = eb.fn
              .sum<number>('completedActivities.points')
              .filterWhere('occurredAt', '>=', ninetyDaysAgo);

            return eb.fn.coalesce(sum, zero).as('pointsInLast90Days');
          },
        ])
        .groupBy('students.id');
    })
    .updateTable('students')
    .from('updatedPoints')
    .set(({ ref }) => {
      return {
        points: ref('updatedPoints.pointsAllTime'),
      };
    })
    .whereRef('students.id', '=', 'updatedPoints.studentId')
    .where('updatedPoints.pointsAllTime', '>', 0)
    .returning([
      'students.airtableId',
      'updatedPoints.pointsAllTime',
      'updatedPoints.pointsInLast90Days',

      ({ ref }) => {
        const daysSinceAccepted = sql<number>`
          greatest(
            1,
            extract(
              day from (
                current_timestamp - ${ref('acceptedAt')}
              )
            )
          )
        `;

        return sql<number>`
          round(${ref('pointsAllTime')} / ${daysSinceAccepted}, 2)
        `.as('pointsPerDay');
      },
    ])
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
            Points: member.pointsAllTime,
            'Points (Per Day)': member.pointsPerDay,
            'Points (in Last 90 Days)': member.pointsInLast90Days,
          },
        };
      }),
    });
  });

  return success(members.length);
}
