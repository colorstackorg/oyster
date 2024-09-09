import dayjs from 'dayjs';
import { match } from 'ts-pattern';

import { PreEventNotificationBullJob } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
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

type createPreEventNotificationJobInput = {
  eventID: string;
  startDate: dayjs.Dayjs;
  timezone: string;
};

export async function createPreEventNotificationJob({
  eventID,
  startDate,
  timezone,
}: createPreEventNotificationJobInput) {
  const twoDaysBeforeEvent = dayjs.tz(startDate, timezone).subtract(2, 'day');
  const today = dayjs.tz(dayjs(), timezone);

  // If event is two days from now, create a job to send pre-event notification
  if (today.isBefore(twoDaysBeforeEvent)) {
    const delay = twoDaysBeforeEvent.diff(today);

    const scheduledJob = job(
      'pre_event_notification.created',
      { eventID },
      { delay }
    );
  }

  // TODO: Add job ID to event in database
}
