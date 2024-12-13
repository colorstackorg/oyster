import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { sql } from 'kysely';
import { Check, CheckCircle, ExternalLink, Video } from 'react-feather';
import { generatePath } from 'react-router';

import { countEvents } from '@oyster/core/member-profile/server';
import { db } from '@oyster/db';
import { Button, ProfilePicture, Text } from '@oyster/ui';

import {
  EventDate,
  EventList,
  EventName,
  EventSection,
  formatEventDate,
} from '@/shared/components/event';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const [pastEventsCount, upcomingEventsCount, pastEvents, upcomingEvents] =
    await Promise.all([
      countEvents({ status: 'past' }),
      countEvents({ status: 'upcoming' }),
      getPastEvents({ timezone: getTimezone(request) }),
      getUpcomingEvents({
        studentId: user(session),
        timezone: getTimezone(request),
      }),
    ]);

  return json({
    pastEvents,
    pastEventsCount,
    upcomingEvents,
    upcomingEventsCount,
  });
}

type GetPastEventsInput = {
  timezone: string;
};

async function getPastEvents({ timezone }: GetPastEventsInput) {
  const records = await db
    .selectFrom('events')
    .select([
      'endTime',
      'id',
      'name',
      'recordingLink',
      'startTime',
      (eb) => {
        return eb
          .selectFrom(
            eb
              .selectFrom('eventAttendees')
              .leftJoin('students', 'students.id', 'eventAttendees.studentId')
              .select(['students.profilePicture'])
              .whereRef('eventAttendees.eventId', '=', 'events.id')
              .where('students.profilePicture', 'is not', null)
              .orderBy('eventAttendees.createdAt', 'asc')
              .limit(3)
              .as('rows')
          )
          .select([
            sql<string>`string_agg(profile_picture, ',')`.as('profilePictures'),
          ])
          .as('profilePictures');
      },
      (eb) => {
        return eb
          .selectFrom('eventAttendees')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('eventAttendees.eventId', '=', 'events.id')
          .as('attendeesCount');
      },
    ])
    .where('endTime', '<=', new Date())
    .where('events.hidden', '=', false)
    .orderBy('startTime', 'desc')
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
        .filter(Boolean);

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

type GetUpcomingEventsInput = {
  studentId: string;
  timezone: string;
};

async function getUpcomingEvents({
  studentId,
  timezone,
}: GetUpcomingEventsInput) {
  const records = await db
    .selectFrom('events')
    .select([
      'endTime',
      'externalLink',
      'id',
      'name',
      'startTime',
      (eb) => {
        return eb
          .exists(
            eb
              .selectFrom('eventRegistrations')
              .whereRef('eventRegistrations.eventId', '=', 'events.id')
              .where('eventRegistrations.studentId', '=', studentId)
          )
          .as('isRegistered');
      },
      (eb) => {
        return eb
          .selectFrom(
            eb
              .selectFrom('eventRegistrations')
              .leftJoin(
                'students',
                'students.id',
                'eventRegistrations.studentId'
              )
              .select([
                'eventRegistrations.registeredAt',
                'students.profilePicture',
              ])
              .whereRef('eventRegistrations.eventId', '=', 'events.id')
              .where('students.profilePicture', 'is not', null)
              .orderBy('eventRegistrations.registeredAt', 'desc')
              .limit(3)
              .as('rows')
          )
          .select([
            sql<string>`string_agg(profile_picture, ',')`.as('profilePictures'),
          ])
          .as('profilePictures');
      },
      (eb) => {
        return eb
          .selectFrom('eventRegistrations')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('eventRegistrations.eventId', '=', 'events.id')
          .as('registrationsCount');
      },
    ])
    .where('endTime', '>', new Date())
    .where('events.hidden', '=', false)
    .orderBy('startTime', 'asc')
    .execute();

  const events = records.map(
    ({
      endTime,
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
        .filter(Boolean);

      return {
        ...record,
        date,
        profilePictures,
        registrationsCount: Number(registrationsCount),
      };
    }
  );

  return events;
}

export default function EventsPage() {
  const { pastEventsCount, upcomingEventsCount } =
    useLoaderData<typeof loader>();

  return (
    <>
      <Text variant="2xl">Events 📅</Text>

      <section>
        <Text variant="2xl">Upcoming Events ({upcomingEventsCount})</Text>
        <UpcomingEvents />
      </section>

      <section>
        <Text variant="2xl">Past Events ({pastEventsCount})</Text>
        <PastEvents />
      </section>
    </>
  );
}

type UpcomingEvent = SerializeFrom<typeof loader>['upcomingEvents'][number];

function UpcomingEvents() {
  const { upcomingEvents } = useLoaderData<typeof loader>();

  return (
    <>
      <EventSection>
        {upcomingEvents.length ? (
          <EventList>
            {upcomingEvents.map((event) => {
              return <UpcomingEventItem key={event.id} event={event} />;
            })}
          </EventList>
        ) : (
          <Text color="gray-500">There are no upcoming events.</Text>
        )}
      </EventSection>

      <Outlet />
    </>
  );
}

type UpcomingEventItemProps = {
  event: UpcomingEvent;
};

function UpcomingEventItem({ event }: UpcomingEventItemProps) {
  return (
    <li className="flex flex-col rounded-2xl border border-gray-200">
      <div className="h-24 w-full rounded-[inherit] bg-[url(/images/colorstack-background.png)] bg-contain" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <EventName name={event.name} />
        <EventDate date={event.date} />
        <RegisteredStatus registered={!!event.isRegistered} />

        {!!event.registrationsCount && (
          <EventRegistrations
            id={event.id}
            profilePictures={event.profilePictures}
            registrationsCount={event.registrationsCount}
          />
        )}

        <Button.Group fill>
          {event.externalLink && (
            <Button.Slot fill size="small" variant="secondary">
              <a href={event.externalLink} target="_blank">
                <ExternalLink className="h-5 w-5 text-primary" /> See Details
              </a>
            </Button.Slot>
          )}

          {!event.isRegistered && <RegisterButton id={event.id} />}
        </Button.Group>
      </div>
    </li>
  );
}

function EventRegistrations({
  id,
  profilePictures,
  registrationsCount,
}: Pick<UpcomingEvent, 'id' | 'profilePictures' | 'registrationsCount'>) {
  return (
    <div className="my-2 flex items-center gap-2">
      <ul className="flex">
        {profilePictures.map((profilePicture) => {
          return (
            <li className="-ml-3 first:ml-0" key={profilePicture}>
              <ProfilePicture initials="" size="32" src={profilePicture} />
            </li>
          );
        })}
      </ul>

      <Link
        className="link"
        to={generatePath(Route['/events/:id/registrations'], { id })}
      >
        {registrationsCount} people going
      </Link>
    </div>
  );
}

function RegisteredStatus({ registered }: { registered: boolean }) {
  return registered ? (
    <div className="flex items-center gap-2">
      <CheckCircle className="h-5 w-5 text-primary" />
      <Text className="text-primary" variant="sm">
        Going
      </Text>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <CheckCircle className="h-5 w-5 text-gray-500" />
      <Text className="text-gray-500" variant="sm">
        Not Going
      </Text>
    </div>
  );
}

function RegisterButton({ id }: Pick<UpcomingEvent, 'id'>) {
  return (
    <Button.Slot fill size="small">
      <Link to={generatePath(Route['/events/:id/register'], { id })}>
        <Check size={20} /> Register
      </Link>
    </Button.Slot>
  );
}

type PastEvent = SerializeFrom<typeof loader>['pastEvents'][number];

function PastEvents() {
  const { pastEvents } = useLoaderData<typeof loader>();

  return (
    <>
      <EventSection>
        <EventList>
          {pastEvents.map((event) => {
            return <PastEventItem key={event.id} event={event} />;
          })}
        </EventList>
      </EventSection>

      <Outlet />
    </>
  );
}

type PastEventItemProps = {
  event: PastEvent;
};

function PastEventItem({ event }: PastEventItemProps) {
  return (
    <li className="flex flex-col rounded-2xl border border-gray-200">
      <div className="h-24 w-full rounded-[inherit] bg-[url(/images/colorstack-background.png)] bg-contain" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <EventName name={event.name} />
        <EventDate date={event.date} />

        {!!event.attendeesCount && (
          <EventAttendees
            attendeesCount={event.attendeesCount}
            id={event.id}
            profilePictures={event.profilePictures}
          />
        )}

        <Button.Slot
          className={!event.recordingLink && 'invisible'}
          fill
          size="small"
          variant="secondary"
        >
          <a href={event.recordingLink || undefined} target="_blank">
            View Recording <Video />
          </a>
        </Button.Slot>
      </div>
    </li>
  );
}

function EventAttendees({
  attendeesCount,
  id,
  profilePictures,
}: Pick<PastEvent, 'attendeesCount' | 'id' | 'profilePictures'>) {
  return (
    <div className="my-2 flex items-center gap-2">
      <ul className="flex">
        {profilePictures.map((profilePicture) => {
          return (
            <li className="-ml-3 first:ml-0" key={profilePicture}>
              <ProfilePicture initials="" size="32" src={profilePicture} />
            </li>
          );
        })}
      </ul>

      <Link
        className="link"
        to={generatePath(Route['/events/:id/attendees'], { id })}
      >
        {attendeesCount} people attended
      </Link>
    </div>
  );
}
