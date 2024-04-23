import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { generatePath, Link, Outlet, useLoaderData } from '@remix-run/react';
import { sql } from 'kysely';
import { Video } from 'react-feather';

import { EventType } from '@oyster/types';
import { cx, getButtonCn, ProfilePicture } from '@oyster/ui';

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
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const pastEvents = await getPastEvents({
    timezone: getTimezone(request),
  });

  return json({
    pastEvents,
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
    .where('type', '=', EventType.VIRTUAL)
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

type PastEvent = SerializeFrom<typeof loader>['pastEvents'][number];

export default function PastEvents() {
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
    <li className="flex flex-col rounded-3xl border border-gray-200">
      <div className="h-24 w-full rounded-[inherit] bg-[url(/images/colorstack-background.png)] bg-contain" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <EventName name={event.name} />
        <EventDate date={event.date} />

        {!!event.attendeesCount && (
          <EventAttendees
            attendeesCount={event.attendeesCount}
            id={event.id}
            profilePictures={event.profilePictures}
          />
        )}

        {!!event.recordingLink && (
          <a
            className={cx(
              getButtonCn({ fill: true, size: 'small', variant: 'secondary' }),
              'mt-2'
            )}
            href={event.recordingLink}
            target="_blank"
          >
            View Recording <Video />
          </a>
        )}
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
        to={generatePath(Route['/events/past/:id/attendees'], { id })}
      >
        {attendeesCount} people attended
      </Link>
    </div>
  );
}
