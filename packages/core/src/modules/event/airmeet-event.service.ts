import dayjs from 'dayjs';
import { z } from 'zod';

import { Event, EventAttendee } from '@oyster/types';
import { sleep } from '@oyster/utils';

import { redis, RedisKey } from '@/infrastructure/redis';
import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { ENV, IS_PRODUCTION } from '@/shared/env';
import { ErrorWithContext } from '@/shared/errors';
import { validate } from '@/shared/utils/zod.utils';

const AIRMEET_API_URL = 'https://api-gateway.airmeet.com/prod';

const AirmeetCursors = z.object({
  after: z.number(),
  before: z.number(),
  pageCount: z.number(),
});

const GetAirmeetEventResponse = z.object({
  end_time: Event.shape.endTime,
  name: Event.shape.name,
  short_desc: Event.shape.description,
  start_time: Event.shape.startTime,
  timezone: z.string().trim(),
});

export async function getAirmeetEvent(id: string): Promise<Event | null> {
  const headers = await getHeaders();

  const response = await fetch(`${AIRMEET_API_URL}/airmeet/${id}/info`, {
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const data = validate(GetAirmeetEventResponse, await response.json());

  const event: Event = {
    createdAt: new Date(),
    description: data.short_desc,
    endTime: data.end_time,
    externalLink: `https://www.airmeet.com/e/${id}`,
    id,
    name: data.name,
    startTime: data.start_time,
    type: 'virtual',
  };

  return event;
}

const ListAirmeetAttendeesResponse = z.object({
  cursors: AirmeetCursors,
  data: z.array(
    z.object({
      email: EventAttendee.shape.email,
      name: EventAttendee.shape.name,
      time_stamp: EventAttendee.shape.createdAt,
    })
  ),
});

type Attendee = Pick<EventAttendee, 'createdAt' | 'email' | 'name'>;

export async function listAirmeetAttendees(id: string): Promise<Attendee[]> {
  const result: Attendee[] = [];

  // When setting this to a number | undefined, and initializing to undefined,
  // Typescript will say that `response` is any if we reset cursor...can't
  // figure out why.
  let cursor: number = 0;

  let page = 0;
  let pageCount = 0;

  const pageSize = 50;

  // If we get a 202 response, we should wait 5 minutes and try again. In
  // order to not get stuck in an infinite loop, we should only try a
  // maximum number of times.
  let attempts = 0;
  const maxAttempts = 3;

  const url = new URL(`${AIRMEET_API_URL}/airmeet/${id}/attendees`);

  url.searchParams.set('size', pageSize.toString());

  while (true) {
    if (cursor) {
      url.searchParams.set('after', cursor.toString());
    }

    const response = await fetch(url, {
      headers: await getHeaders(),
    });

    if (response.status === 202 && attempts >= maxAttempts) {
      throw new Error(
        `Maximum # of attempts have been reached to fetch attendees for event (${id}).`
      );
    }

    // Per the Airmeet API docs, this is an asynchronous API, so if we get a
    // 202 response, we should wait 5 minutes and try again.
    if (response.status === 202) {
      attempts++;
      console.log('Sleeping...');
      await sleep(1000 * 60 * 2.5);
      continue;
    }

    const data = validate(ListAirmeetAttendeesResponse, await response.json());

    const { cursors, data: attendees } = data;

    if (!cursors) {
      break;
    }

    // We only need to set the page count once, so this condition should only
    // be true on the first iteration.
    if (!pageCount) {
      pageCount = cursors.pageCount;
    }

    // We increment the page number after we've fetched the attendees for the
    // current page. This will be one of our stop conditions.
    page++;

    attendees.forEach((attendee) => {
      result.push({
        createdAt: attendee.time_stamp,
        email: attendee.email,
        name: attendee.name,
      });
    });

    // If the number of attendees returned is less than the page size, then
    // we've reached the end of the list.
    if (attendees.length < pageSize) {
      break;
    }

    // If the page number is greater than the page count, then we've reached
    // the end of the list. This is a safeguard in case the API is behaving
    // unexpectedly.
    if (page >= pageCount) {
      break;
    }

    cursor = cursors.after;
  }

  return result;
}

type ListEventsOptions = {
  startsAfter?: Date;
  startsBefore?: Date;
};

const ListAirmeetEventsResponse = z.object({
  cursors: AirmeetCursors,
  data: z.array(
    z.object({
      endTime: Event.shape.endTime,
      name: Event.shape.name,
      startTime: Event.shape.startTime,
      timezone: z.string().trim(),
      uid: Event.shape.id,
    })
  ),
});

export async function listAirmeetEvents(
  options: ListEventsOptions = {}
): Promise<Event[]> {
  const events: Event[] = [];

  const headers = await getHeaders();

  // Although we would ideally paginate through the results using the "after"
  // cursor, the API doesn't seem to be behaving as expected. So, since we
  // we have under 500 events, we can just fetch them all at once.
  const response = await fetch(`${AIRMEET_API_URL}/airmeets?size=500`, {
    headers,
  });

  const data = validate(ListAirmeetEventsResponse, await response.json());

  data.data.forEach((event) => {
    let include = true;

    if (options.startsAfter) {
      include = dayjs(event.startTime).isAfter(options.startsAfter);
    }

    if (include && options.startsBefore) {
      include = dayjs(event.startTime).isBefore(options.startsBefore);
    }

    if (include) {
      events.push({
        createdAt: new Date(),
        description: undefined,
        endTime: event.endTime,
        externalLink: `https://www.airmeet.com/e/${event.uid}`,
        id: event.uid,
        name: event.name,
        startTime: event.startTime,
        type: 'virtual',
      });
    }
  });

  return events;
}

type RegisterForEventInput = {
  email: string;
  eventId: string;
  firstName: string;
  lastName: string;
};

class RegisterForAirmeetEventError extends ErrorWithContext {
  message = 'Failed to register for Airmeet event.';
}

export async function registerForAirmeetEvent(input: RegisterForEventInput) {
  if (!IS_PRODUCTION) {
    return;
  }

  const headers = await getHeaders();

  const response = await fetch(
    `${AIRMEET_API_URL}/airmeet/${input.eventId}/attendee`,
    {
      body: JSON.stringify({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        registerAttendee: true,
        sendEmailInvite: true,
      }),
      headers,
      method: 'post',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new RegisterForAirmeetEventError().withContext(data);

    reportException(error);
    throw error;
  }

  return;
}

type AirmeetHeaders = {
  'Accept-Encoding': string;
  'Content-Type': string;
  'X-Airmeet-Access-Token': string;
};

async function getHeaders(): Promise<AirmeetHeaders> {
  return {
    'Accept-Encoding': 'gzip,deflate,compress',
    'Content-Type': 'application/json',
    'X-Airmeet-Access-Token': await getAccessToken(),
  };
}

const IssueAirmeetTokenResponse = z.object({
  token: z.string(),
});

async function getAccessToken(): Promise<string> {
  const cachedAccessToken = await redis.get(RedisKey.AIRMEET_ACCESS_TOKEN);

  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const response = await fetch(`${AIRMEET_API_URL}/auth`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'X-Airmeet-Access-Key': ENV.AIRMEET_ACCESS_KEY,
      'X-Airmeet-Secret-Key': ENV.AIRMEET_SECRET_KEY,
    },
  });

  const data = validate(IssueAirmeetTokenResponse, await response.json());

  const accessToken = data.token;

  // We'll cache the access token for 30 days...
  await redis.set(
    RedisKey.AIRMEET_ACCESS_TOKEN,
    accessToken,
    'EX',
    60 * 60 * 24 * 30
  );

  return accessToken;
}
