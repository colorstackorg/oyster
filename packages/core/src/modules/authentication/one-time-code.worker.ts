import { match } from 'ts-pattern';

import { registerWorker } from '@/infrastructure/bull';
import { OneTimeCodeBullJob } from '@/infrastructure/bull.types';
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
