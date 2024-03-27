import { match } from 'ts-pattern';

import { EducationHistoryBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { onEducationAdded } from './events/education-added';
import { onEducationDeleted } from './events/education-deleted';

export const educationWorker = registerWorker(
  'education_history',
  EducationHistoryBullJob,
  async (result) => {
    return match(result)
      .with({ name: 'education.added' }, ({ data }) => {
        return onEducationAdded(data);
      })
      .with({ name: 'education.deleted' }, ({ data }) => {
        return onEducationDeleted(data);
      })
      .exhaustive();
  }
);
