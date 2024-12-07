import { match } from 'ts-pattern';

import { registerWorker } from '@/infrastructure/bull/bull';
import { OnboardingSessionBullJob } from '@/infrastructure/bull/bull.types';
import { onOnboardingSessionAttended } from './events/onboarding-session-attended';

export const onboardingSessionWorker = registerWorker(
  'onboarding_session',
  OnboardingSessionBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'onboarding_session.attended' }, ({ data }) => {
        return onOnboardingSessionAttended(data);
      })
      .exhaustive();
  }
);
