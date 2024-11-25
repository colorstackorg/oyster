import { match } from 'ts-pattern';

import { ProfileBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { sendProfileViewsNotification } from './use-cases/send-profile-views-notification';

export const profileWorker = registerWorker(
  'profile',
  ProfileBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'profile.views.notification.monthly' }, ({ data }) => {
        return sendProfileViewsNotification(data);
      })
      .exhaustive();
  }
);
