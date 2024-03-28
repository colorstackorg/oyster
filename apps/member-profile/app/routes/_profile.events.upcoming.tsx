import { json, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { sql } from 'kysely';
import { Check, CheckCircle, ExternalLink } from 'react-feather';
import { generatePath } from 'react-router';

import { Button, getButtonCn, Text } from '@oyster/core-ui';
import { ProfilePicture } from '@oyster/feature-ui';
import { EventType } from '@oyster/types';

import {
  EventDate,
  EventList,
  EventName,
  EventSection,
  formatEventDate,
} from '../shared/components/event';
import { Route } from '../shared/constants';
import { getTimezone } from '../shared/cookies.server';
import { db } from '../shared/core.server';
import { ensureUserAuthenticated, user } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const upcomingEvents = await getUpcomingEvents({
    studentId: user(session),
    timezone: getTimezone(request),
  });

  return json({
    upcomingEvents,
  });
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
    .where('type', '=', EventType.VIRTUAL)
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

type UpcomingEvent = SerializeFrom<typeof loader>['upcomingEvents'][number];

export default function UpcomingEvents() {
  const { upcomingEvents } = useLoaderData<typeof loader>();

  return (
    <>
      <EventSection>
        {!!upcomingEvents.length ? (
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
    <li className="flex flex-col rounded-3xl border border-gray-200">
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
            <a
              className={getButtonCn({
                fill: true,
                size: 'small',
                variant: 'secondary',
              })}
              href={event.externalLink}
              target="_blank"
            >
              <ExternalLink className="text-primary h-5 w-5" /> See Details
            </a>
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
        to={generatePath(Route['/events/upcoming/:id/registrations'], { id })}
      >
        {registrationsCount} people going
      </Link>
    </div>
  );
}

function RegisteredStatus({ registered }: { registered: boolean }) {
  return registered ? (
    <div className="flex items-center gap-2">
      <CheckCircle className="text-primary h-5 w-5" />
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
    <Link
      className={getButtonCn({ fill: true, size: 'small' })}
      to={generatePath(Route['/events/upcoming/:id/register'], { id })}
    >
      <Check className="h-5 w-5 text-white" /> Register
    </Link>
  );
}
