import { match } from 'ts-pattern';

import { registerWorker } from '@/infrastructure/bull';
import { NotificationBullJob } from '@/infrastructure/bull.types';
import { sendEphemeralSlackNotification } from '@/modules/notification/use-cases/send-ephemeral-slack-notification';
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
      .with({ name: 'notification.slack.ephemeral.send' }, async ({ data }) => {
        return sendEphemeralSlackNotification(data);
      })
      .with({ name: 'notification.slack.send' }, async ({ data }) => {
        return sendSlackNotification(data);
      })
      .exhaustive();
  }
);
