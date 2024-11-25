import { match } from 'ts-pattern';

import { MemberEmailBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
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
