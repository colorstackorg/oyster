import { match } from 'ts-pattern';

import { StudentBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { backfillActiveStatuses } from '@/modules/active-status/use-cases/backfill-active-statuses';
import { createNewActiveStatuses } from '@/modules/active-status/use-cases/create-new-active-statuses';
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
