import { match } from 'ts-pattern';

import { TwilioMessagingBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { sendMessages } from './twilio.service';

debugger;
export const twilioWorker = registerWorker(
  'twilio',
  TwilioMessagingBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'twilio.messaging' }, ({ data }) => {
        return sendMessages(data);
      })
      .exhaustive();
  }
);
