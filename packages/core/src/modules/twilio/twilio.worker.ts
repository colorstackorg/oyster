import { match } from 'ts-pattern';

import { registerWorker } from '@/infrastructure/bull';
import { TwilioMessagingBullJob } from '@/infrastructure/bull.types';
import { sendMessages } from './twilio.service';

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
