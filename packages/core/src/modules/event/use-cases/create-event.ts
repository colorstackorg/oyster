import dayjs from 'dayjs';

import { Event } from '@colorstack/types';
import { id } from '@colorstack/utils';

import { db } from '@/infrastructure/database';

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
  await db
    .insertInto('events')
    .values({
      description,
      endTime: dayjs.tz(endTime, timezone).toDate(),
      id: id(),
      name,
      startTime: dayjs.tz(startTime, timezone).toDate(),
      type,
    })
    .execute();
}
