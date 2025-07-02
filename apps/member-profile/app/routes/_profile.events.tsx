import { type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import {
  Calendar,
  Check,
  CheckCircle,
  ExternalLink,
  Video,
} from 'react-feather';
import { generatePath } from 'react-router';

import { listPastEvents, listUpcomingEvents } from '@oyster/core/events';
import {
  Button,
  Dashboard,
  ProfilePicture,
  type SerializeFrom,
  Text,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);
  const timezone = getTimezone(request);

  const [pastEvents, upcomingEvents] = await Promise.all([
    listPastEvents({ timezone }),
    listUpcomingEvents({ memberId, timezone }),
  ]);

  return {
    pastEvents,
    upcomingEvents,
  };
}

export default function EventsPage() {
  const { pastEvents, upcomingEvents } = useLoaderData<typeof loader>();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Events 📅</Dashboard.Title>
      </Dashboard.Header>

      <div className="flex flex-col gap-12">
        <EventSection>
          <EventSectionTitle>
            Upcoming ({upcomingEvents.length})
          </EventSectionTitle>
          <UpcomingEvents />
        </EventSection>

        <EventSection>
          <EventSectionTitle>Past ({pastEvents.length})</EventSectionTitle>
          <PastEvents />
        </EventSection>
      </div>

      <Outlet />
    </>
  );
}

function UpcomingEvents() {
  const { upcomingEvents } = useLoaderData<typeof loader>();

  if (!upcomingEvents.length) {
    return <Text color="gray-500">There are no upcoming events.</Text>;
  }

  return (
    <EventList>
      {upcomingEvents.map((event) => {
        return <UpcomingEventCard key={event.id} {...event} />;
      })}
    </EventList>
  );
}

function PastEvents() {
  const { pastEvents } = useLoaderData<typeof loader>();

  if (!pastEvents.length) {
    return <Text color="gray-500">There are no past events.</Text>;
  }

  return (
    <EventList>
      {pastEvents.map((event) => {
        return <PastEventItem key={event.id} {...event} />;
      })}
    </EventList>
  );
}

// Upcoming Event Card

type UpcomingEvent = SerializeFrom<typeof loader>['upcomingEvents'][number];

function UpcomingEventCard({
  date,
  externalLink,
  id,
  isRegistered,
  name,
  profilePictures,
  registrationsCount,
}: UpcomingEvent) {
  return (
    <EventCard>
      <EventBackground />

      <EventContent>
        <EventName name={name} />
        <EventDate date={date} />

        {isRegistered ? (
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
        )}

        {!!registrationsCount && (
          <div className="my-2 flex items-center gap-2">
            <EventPeople profilePictures={profilePictures} />

            <Link
              className="link"
              to={generatePath(Route['/events/:id/registrations'], { id })}
            >
              {registrationsCount} people going
            </Link>
          </div>
        )}

        <Button.Group fill>
          {externalLink && (
            <Button.Slot fill variant="secondary">
              <Link to={externalLink} target="_blank">
                <ExternalLink className="h-5 w-5 text-primary" /> See Details
              </Link>
            </Button.Slot>
          )}

          {!isRegistered && (
            <Button.Slot fill>
              <Link to={generatePath(Route['/events/:id/register'], { id })}>
                <Check size={20} /> Register
              </Link>
            </Button.Slot>
          )}
        </Button.Group>
      </EventContent>
    </EventCard>
  );
}

// Past Event Item

type PastEvent = SerializeFrom<typeof loader>['pastEvents'][number];

function PastEventItem({
  attendeesCount,
  date,
  id,
  name,
  profilePictures,
  recordingLink,
}: PastEvent) {
  return (
    <EventCard>
      <EventBackground />

      <EventContent>
        <EventName name={name} />
        <EventDate date={date} />

        {!!attendeesCount && (
          <div className="my-2 flex items-center gap-2">
            <EventPeople profilePictures={profilePictures} />

            <Link
              className="link"
              to={generatePath(Route['/events/:id/attendees'], { id })}
            >
              {attendeesCount} people attended
            </Link>
          </div>
        )}

        <Button.Slot
          className={!recordingLink && 'invisible'}
          fill
          variant="secondary"
        >
          <a href={recordingLink || undefined} target="_blank">
            View Recording <Video />
          </a>
        </Button.Slot>
      </EventContent>
    </EventCard>
  );
}

// Helpers

function EventBackground() {
  return (
    <div className="h-24 w-full rounded-[inherit] bg-[url(/images/colorstack-background.png)] bg-contain" />
  );
}

function EventCard({ children }: PropsWithChildren) {
  return (
    <li className="flex flex-col rounded-2xl border border-gray-200">
      {children}
    </li>
  );
}

function EventContent({ children }: PropsWithChildren) {
  return <div className="flex flex-1 flex-col gap-3 p-4">{children}</div>;
}

type EventDateProps = {
  date: string;
};

function EventDate({ date }: EventDateProps) {
  return (
    <div className="flex gap-2">
      <Calendar className="h-5 w-5 text-gray-500" />
      <Text color="gray-500" variant="sm">
        {date}
      </Text>
    </div>
  );
}

function EventList({ children }: PropsWithChildren) {
  return (
    <ul className="grid grid-cols-1 gap-4 @[720px]:grid-cols-2 @[1080px]:grid-cols-3 @[1440px]:grid-cols-4">
      {children}
    </ul>
  );
}

type EventNameProps = {
  name: string;
};

function EventName({ name }: EventNameProps) {
  return (
    <Text className="mb-auto" variant="lg" weight="600">
      {name}
    </Text>
  );
}

type EventPeopleProps = {
  profilePictures: string[];
};

function EventPeople({ profilePictures }: EventPeopleProps) {
  return (
    <ul className="flex">
      {profilePictures.map((picture) => {
        return (
          <li className="-ml-3 first:ml-0" key={picture}>
            <ProfilePicture initials="" size="32" src={picture} />
          </li>
        );
      })}
    </ul>
  );
}

function EventSection({ children }: PropsWithChildren) {
  return <section className="flex flex-col gap-2">{children}</section>;
}

function EventSectionTitle({ children }: PropsWithChildren) {
  return (
    <Text variant="lg" weight="500">
      {children}
    </Text>
  );
}
