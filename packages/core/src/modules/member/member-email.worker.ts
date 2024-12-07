import { match } from 'ts-pattern';

import { registerWorker } from '@/infrastructure/bull';
import { MemberEmailBullJob } from '@/infrastructure/bull.types';
import { onEmailAdded } from './events/member-email-added';
import { onPrimaryEmailChanged } from './events/member-primary-email-changed';

export const memberEmailWorker = registerWorker(
  'member_email',
  MemberEmailBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'member_email.added' }, ({ data }) => {
        return onEmailAdded(data);
      })
      .with({ name: 'member_email.primary.changed' }, ({ data }) => {
        return onPrimaryEmailChanged(data);
      })
      .exhaustive();
  }
);
