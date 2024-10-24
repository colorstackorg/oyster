import dayjs from 'dayjs';

import { db } from '@oyster/db';
import { type Event } from '@oyster/types';
import { id } from '@oyster/utils';

import { createPreEventNotificationJob } from '@/modules/event/use-cases/pre-event-notification';

type CreateEventInput = Pick<Event, 'description' | 'name' | 'type'> & {
  endTime: string;
  startTime: string;
  timezone: string;
};

export async function createEvent({
  description,
  endTime,
  startTime,
  timezone,
  name,
  type,
}: CreateEventInput) {
  const eventId = id();
  const startDate = dayjs.tz(startTime, timezone);

  await db
    .insertInto('events')
    .values({
      description,
      endTime: dayjs.tz(endTime, timezone).toDate(),
      hidden: type === 'irl',
      id: eventId,
      name,
      startTime: startDate.toDate(),
      type,
    })
    .execute();

  await createPreEventNotificationJob({
    eventId,
    startDate,
    timezone,
  });
}
