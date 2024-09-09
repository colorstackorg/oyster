import { match } from 'ts-pattern';

import { PreEventNotificationBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
// import { sendPreEventNotification } from './send-pre-event-notification';

export const preEventNotificationWorker = registerWorker(
  'pre_event_notification',
  PreEventNotificationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'pre_event_notification.created' }, ({ data }) => {
        return console.log('Pre event notification for event sent');
        // return sendPreEventNotification(data);
      })
      .exhaustive();
  }
);
