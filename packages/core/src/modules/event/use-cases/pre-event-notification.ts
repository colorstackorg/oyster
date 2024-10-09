import dayjs from 'dayjs';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { getQueue } from '@/admin-dashboard.server';
import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

// Change the line below with the function from issue #477
// import { sendPreEventNotificationEmails } from './send-pre-event-notification-emails';

type createPreEventNotificationJobInput = {
  eventId: string;
  startDate: dayjs.Dayjs;
  timezone: string;
};

export async function sendPreEventNotification({
  eventId,
}: GetBullJobData<'event.notification'>) {
  // sendPreEventNotificationEmails(eventID);
  console.log('Pre event notifications for event with ID' + eventId + 'sent!');

  await db
    .updateTable('events')
    .set({ preEventNotificationJobId: null })
    .where('id', '=', eventId)
    .execute();
}

export async function deletePreEventNotification({
  preEventNotificationJobId,
}: {
  preEventNotificationJobId: string | null;
}) {
  if (preEventNotificationJobId) {
    const queue = getQueue('event');
    const job = await queue.getJob(preEventNotificationJobId);

    if (!job) {
      throw new Response(null, { status: 404 });
    }

    return job.remove();
  }
}

export async function createPreEventNotificationJob({
  eventId,
  startDate,
  timezone,
}: createPreEventNotificationJobInput) {
  const twoDaysBeforeEvent = dayjs.tz(startDate, timezone).subtract(2, 'day');
  const today = dayjs.tz(dayjs(), timezone);

  // If event is two days from now, create a job to send pre-event notification
  if (today.isBefore(twoDaysBeforeEvent)) {
    const delay = twoDaysBeforeEvent.diff(today);

    const customJobID = id();

    job('event.notification', { eventId }, { delay, jobId: customJobID });

    await db
      .updateTable('events')
      .set({ preEventNotificationJobId: customJobID })
      .where('id', '=', eventId)
      .execute();
  }
}
