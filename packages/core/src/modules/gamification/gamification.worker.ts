import { match } from 'ts-pattern';

import { GamificationBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { grantGamificationPoints } from './use-cases/grant-gamification-points';
import { revokeGamificationPoints } from './use-cases/revoke-gamification-points';

export const gamificationWorker = registerWorker(
  'gamification',
  GamificationBullJob,
  async (job) => {
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
