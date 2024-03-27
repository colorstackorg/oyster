import { match } from 'ts-pattern';

import { SurveyBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { onRespondedToSurvey } from './events/survey.responded';

export const surveyWorker = registerWorker(
  'survey',
  SurveyBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'survey.responded' }, ({ data }) => {
        return onRespondedToSurvey(data);
      })
      .exhaustive();
  }
);
