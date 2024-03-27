import { match } from 'ts-pattern';

import { NotificationBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { sendEmail } from './use-cases/send-email';
import { sendSlackNotification } from './use-cases/send-slack-notification';

export const notificationWorker = registerWorker(
  'notification',
  NotificationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'notification.email.send' }, async ({ data }) => {
        return sendEmail(data);
      })
      .with({ name: 'notification.slack.send' }, async ({ data }) => {
        return sendSlackNotification(data);
      })
      .exhaustive();
  }
);
