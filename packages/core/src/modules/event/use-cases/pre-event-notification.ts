import dayjs from 'dayjs';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { getQueue } from '@/admin-dashboard.server';
import {
  type GetBullJobData,
  PreEventNotificationBullJob,
} from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';

// Change the line below with the function from issue #477
// import { sendPreEventNotificationEmails } from './send-pre-event-notification-emails';

export const preEventNotificationWorker = registerWorker(
  'pre_event_notification',
  PreEventNotificationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'pre_event_notification.created' }, ({ data }) => {
        return sendPreEventNotification(data);
      })
      .exhaustive();
  }
);

type createPreEventNotificationJobInput = {
  eventID: string;
  startDate: dayjs.Dayjs;
  timezone: string;
};

async function sendPreEventNotification({
  eventID,
}: GetBullJobData<'pre_event_notification.created'>) {
  // sendPreEventNotificationEmails(eventID);
  console.log('Pre event notifications for event with ID' + eventID + 'sent!');

  await db
    .updateTable('events')
    .set({ preEventNotificationJobId: null })
    .where('id', '=', eventID)
    .execute();
}

export async function deletePreEventNotification({
  preEventNotificationJobId,
}: {
  preEventNotificationJobId: string | null;
}) {
  if (preEventNotificationJobId) {
    const queue = getQueue('pre_event_notification');
    const job = await queue.getJob(preEventNotificationJobId);

    if (!job) {
      throw new Response(null, { status: 404 });
    }

    return job.remove();
  }
}

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

    const customJobID = id();

    job(
      'pre_event_notification.created',
      { eventID },
      { delay, jobId: customJobID }
    );

    await db
      .updateTable('events')
      .set({ preEventNotificationJobId: customJobID })
      .where('id', '=', eventID)
      .execute();
  }
}
