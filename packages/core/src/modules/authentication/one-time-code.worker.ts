import { match } from 'ts-pattern';

import { OneTimeCodeBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { expireOneTimeCode } from './use-cases/expire-one-time-code';

export const oneTimeCodeWorker = registerWorker(
  'one_time_code',
  OneTimeCodeBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'one_time_code.expire' }, ({ data }) => {
        return expireOneTimeCode(data);
      })
      .exhaustive();
  }
);
