import dayjs from 'dayjs';
import { type SelectExpression, sql } from 'kysely';
import { match } from 'ts-pattern';
import { type z } from 'zod';

import { type DB, db } from '@oyster/db';
import { Event, type EventType } from '@oyster/types';
import { id } from '@oyster/utils';

import { job, registerWorker } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { EventBullJob } from '@/infrastructure/bull.types';
import { listAirmeetEvents } from '@/modules/events/airmeet';
import { ActivityType } from '@/modules/gamification/gamification.types';
import { getMemberByEmail } from '@/modules/members/queries/get-member-by-email';
import { NotFoundError } from '@/shared/errors';
import { getAirmeetEvent, listAirmeetAttendees } from './airmeet';
import {
  onRegisteredForEvent,
  registerForEventOnAirmeet,
} from './event-registrations';

// Write

// "Add Event Recording Link"

export const AddEventRecordingLinkInput = Event.pick({
  recordingLink: true,
});

export type AddEventRecordingLinkInput = z.infer<
  typeof AddEventRecordingLinkInput
>;

export async function addEventRecordingLink(
  id: string,
  { recordingLink }: AddEventRecordingLinkInput
) {
  await db
    .updateTable('events')
    .set({ recordingLink })
    .where('id', '=', id)
    .executeTakeFirst();
}

// "Create Event"

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
      hidden: type === 'irl',
      id: id(),
      name,
      startTime: dayjs.tz(startTime, timezone).toDate(),
      type,
    })
    .execute();
}

// "Delete Event"

/**
 * Deletes an event. This will also delete any associated records/data, such as:
 * - `completed_activities` (for `ActivityType.ATTEND_EVENT`)
 * - `event_attendees`
 * - `event_registrations`
 *
 * @param id - ID of the event to delete.
 */
export async function deleteEvent(id: string) {
  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('completedActivities')
      .where('type', '=', ActivityType.ATTEND_EVENT)
      .where('eventAttended', '=', id)
      .execute();

    await trx.deleteFrom('eventAttendees').where('eventId', '=', id).execute();

    await trx
      .deleteFrom('eventRegistrations')
      .where('eventId', '=', id)
      .execute();

    await trx.deleteFrom('events').where('id', '=', id).execute();
  });
}

// Read

// "Get Event"

type GetEventOptions = {
  include?: 'isCheckedIn'[];
  memberId?: string;
  type?: EventType;
  withIsRegistered?: boolean;
};

export async function getEvent<
  Selection extends SelectExpression<DB, 'events'>,
>(
  id: string,
  selections: Selection[],
  { include = [], memberId, type, withIsRegistered }: GetEventOptions = {}
) {
  const result = await db
    .selectFrom('events')
    .select(selections)
    .$if(!!withIsRegistered && !!memberId, (qb) => {
      return qb.select((eb) => {
        return eb
          .exists(
            eb
              .selectFrom('eventRegistrations')
              .whereRef('eventRegistrations.eventId', '=', 'events.id')
              .where('eventRegistrations.studentId', '=', memberId!)
          )
          .as('isRegistered');
      });
    })
    .$if(include.includes('isCheckedIn') && !!memberId, (qb) => {
      return qb.select((eb) => {
        return eb
          .exists(
            eb
              .selectFrom('eventAttendees')
              .whereRef('eventAttendees.eventId', '=', 'events.id')
              .where('eventAttendees.studentId', '=', memberId!)
          )
          .as('isCheckedIn');
      });
    })
    .where('events.id', '=', id)
    .$if(!!type, (qb) => {
      return qb.where('events.type', '=', type!);
    })
    .executeTakeFirst();

  return result;
}

// "List Events"

type ListEventsQuery = Partial<{
  limit: number;
  page: number;
  search: string;
}>;

export async function listEvents<
  Selection extends SelectExpression<DB, 'events'>,
>({ limit = 100, page = 1, search }: ListEventsQuery, selections: Selection[]) {
  const query = db.selectFrom('events').$if(!!search, (qb) => {
    return qb.where('events.name', 'ilike', `%${search}%`);
  });

  const [events, countResult] = await Promise.all([
    query
      .select(selections)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy('events.startTime', 'desc')
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    events,
    totalEvents: parseInt(countResult.count),
  };
}

// "List Past Events"

type ListPastEventsInput = {
  timezone: string;
};

export async function listPastEvents({ timezone }: ListPastEventsInput) {
  const records = await db
    .selectFrom('events')
    .leftJoin('eventAttendees', 'eventAttendees.eventId', 'events.id')
    .leftJoin('students', 'students.id', 'eventAttendees.studentId')
    .select([
      'events.endTime',
      'events.id',
      'events.name',
      'events.recordingLink',
      'events.startTime',
      ({ ref }) => {
        const field = sql<string>`string_agg(${ref('students.profilePicture')}, ',' order by ${ref('eventAttendees.createdAt')} asc)`;

        return field.as('profilePictures');
      },
      ({ fn }) => {
        return fn
          .count<string>('eventAttendees.email')
          .distinct()
          .as('attendeesCount');
      },
    ])
    .where('events.endTime', '<=', new Date())
    .where('events.hidden', '=', false)
    .groupBy('events.id')
    .orderBy('events.startTime', 'desc')
    .execute();

  const events = records.map(
    ({
      attendeesCount,
      endTime,
      profilePictures: _profilePictures,
      startTime,
      ...record
    }) => {
      const date = formatEventDate(
        { endTime, startTime },
        { format: 'short', timezone }
      );

      const profilePictures = (_profilePictures || '')
        .split(',')
        .filter(Boolean)
        .slice(0, 3);

      return {
        ...record,
        attendeesCount: Number(attendeesCount),
        date,
        profilePictures,
      };
    }
  );

  return events;
}

type ListUpcomingEventsInput = {
  memberId: string;
  timezone: string;
};

export async function listUpcomingEvents({
  memberId,
  timezone,
}: ListUpcomingEventsInput) {
  const records = await db
    .selectFrom('events')
    .leftJoin('eventRegistrations', 'eventRegistrations.eventId', 'events.id')
    .leftJoin('students', 'students.id', 'eventRegistrations.studentId')
    .select([
      'events.endTime',
      'events.externalLink',
      'events.id',
      'events.name',
      'events.startTime',
      (eb) => {
        return eb.fn
          .max(
            eb
              .case()
              .when('eventRegistrations.studentId', '=', memberId)
              .then(1)
              .else(0)
              .end()
          )
          .as('isRegistered');
      },
      ({ ref }) => {
        const field = sql<string>`string_agg(${ref('students.profilePicture')}, ',' order by ${ref('eventRegistrations.registeredAt')} desc)`;

        return field.as('profilePictures');
      },
      ({ fn }) => {
        return fn
          .count<string>('eventRegistrations.email')
          .distinct()
          .as('registrationsCount');
      },
    ])
    .where('events.endTime', '>', new Date())
    .where('events.hidden', '=', false)
    .groupBy('events.id')
    .orderBy('events.startTime', 'asc')
    .execute();

  const events = records.map(
    ({
      endTime,
      isRegistered,
      profilePictures: _profilePictures,
      registrationsCount,
      startTime,
      ...record
    }) => {
      const date = formatEventDate(
        { endTime, startTime },
        { format: 'short', timezone }
      );

      const profilePictures = (_profilePictures || '')
        .split(',')
        .filter(Boolean)
        .slice(0, 3);

      return {
        ...record,
        date,
        isRegistered: Boolean(isRegistered),
        profilePictures,
        registrationsCount: Number(registrationsCount),
      };
    }
  );

  return events;
}

type FormatEventDateArgs = {
  endTime: Date;
  startTime: Date;
};

type FormatEventDateOptions = {
  format: 'short' | 'long';
  timezone: string;
};

export function formatEventDate(
  { endTime, startTime }: FormatEventDateArgs,
  { format, timezone }: FormatEventDateOptions
) {
  const startTimeObject = dayjs(startTime).tz(timezone);
  const endTimeObject = dayjs(endTime).tz(timezone);

  let start = '';
  let end = '';

  match({
    isSameDate: startTimeObject.date() === endTimeObject.date(),
    format,
  })
    .with({ format: 'short', isSameDate: true }, () => {
      start = startTimeObject.format('ddd, MMM D, YYYY, h:mm A');
      end = endTimeObject.format('h:mm A');
    })
    .with({ format: 'long', isSameDate: true }, () => {
      start = startTimeObject.format('dddd, MMMM D, YYYY, h:mm A');
      end = endTimeObject.format('h:mm A');
    })
    .with({ format: 'short', isSameDate: false }, () => {
      start = startTimeObject.format('ddd, MMM D, YYYY, h:mm A');
      end = endTimeObject.format('ddd, MMM D, YYYY, h:mm A');
    })
    .with({ format: 'long', isSameDate: false }, () => {
      start = startTimeObject.format('dddd, MMMM D, YYYY, h:mm A');
      end = endTimeObject.format('dddd, MMMM D, YYYY, h:mm A');
    })
    .exhaustive();

  return `${start} - ${end}`;
}

// Worker

export const eventWorker = registerWorker(
  'event',
  EventBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'event.attended' }, ({ data }) => {
        return onEventAttended(data);
      })
      .with({ name: 'event.recent.sync' }, ({ data }) => {
        return syncRecentAirmeetEvents(data);
      })
      .with({ name: 'event.register' }, ({ data }) => {
        return registerForEventOnAirmeet(data);
      })
      .with({ name: 'event.registered' }, ({ data }) => {
        return onRegisteredForEvent(data);
      })
      .with({ name: 'event.sync' }, ({ data }) => {
        return syncAirmeetEvent(data);
      })
      .exhaustive();
  }
);

async function onEventAttended({
  eventId,
  studentId,
}: GetBullJobData<'event.attended'>) {
  job('student.activation_requirement_completed', {
    requirement: 'attend_event',
    studentId,
  });

  job('gamification.activity.completed', {
    eventId,
    studentId,
    type: 'attend_event',
  });
}

async function syncRecentAirmeetEvents(_: GetBullJobData<'event.recent.sync'>) {
  const events = await listAirmeetEvents({
    startsAfter: dayjs().subtract(3, 'day').toDate(),
    startsBefore: new Date(),
  });

  events.forEach(async (event) => {
    job('event.sync', {
      eventId: event.id,
    });
  });
}

async function syncAirmeetEvent({ eventId }: GetBullJobData<'event.sync'>) {
  const event = await getAirmeetEvent(eventId);

  if (!event) {
    throw new NotFoundError('Event was not found.').withContext({
      eventId,
    });
  }

  // If the event has already ended, we can fetch the attendees from Airmeet,
  // otherwise, we won't import any attendees.
  const attendees =
    new Date() > event.endTime ? await listAirmeetAttendees(event.id) : [];

  const studentIds: string[] = [];

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('events')
      .values({
        description: event.description,
        endTime: event.endTime,
        externalLink: event.externalLink,
        hidden: false,
        id: event.id,
        name: event.name,
        startTime: event.startTime,
        type: event.type,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();

    await Promise.all(
      attendees.map(async (attendee) => {
        const student = await getMemberByEmail(attendee.email);

        await trx
          .insertInto('eventAttendees')
          .values({
            email: attendee.email,
            eventId: event.id,
            name: attendee.name,
            studentId: student?.id,
          })
          .onConflict((oc) => oc.doNothing())
          .execute();

        if (student?.id) {
          studentIds.push(student.id);
        }
      })
    );
  });

  studentIds.forEach((studentId) => {
    job('event.attended', {
      eventId: event.id,
      studentId,
    });
  });
}
