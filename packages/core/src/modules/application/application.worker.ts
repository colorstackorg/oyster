import { match } from 'ts-pattern';

import { ApplicationBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { onApplicationAccepted } from './events/application-accepted';
import { onApplicationCreated } from './events/application-created';
import { onApplicationRejected } from './events/application-rejected';
import { reviewApplication } from './use-cases/review-application';

export const applicationWorker = registerWorker(
  'application',
  ApplicationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'application.accepted' }, ({ data }) => {
        return onApplicationAccepted(data);
      })
      .with({ name: 'application.created' }, ({ data }) => {
        return onApplicationCreated(data);
      })
      .with({ name: 'application.rejected' }, ({ data }) => {
        return onApplicationRejected(data);
      })
      .with({ name: 'application.review' }, ({ data }) => {
        return reviewApplication(data);
      })
      .exhaustive();
  }
);
