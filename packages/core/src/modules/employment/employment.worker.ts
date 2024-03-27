import { match } from 'ts-pattern';

import { WorkHistoryBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { onWorkExperienceAdded } from './events/work-experience-added';
import { onWorkExperienceDeleted } from './events/work-experience-deleted';

export const workExperienceWorker = registerWorker(
  'work_history',
  WorkHistoryBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'work_experience.added' }, ({ data }) => {
        return onWorkExperienceAdded(data);
      })
      .with({ name: 'work_experience.deleted' }, ({ data }) => {
        return onWorkExperienceDeleted(data);
      })
      .exhaustive();
  }
);
