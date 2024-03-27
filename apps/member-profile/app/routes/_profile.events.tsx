import { json, LoaderFunctionArgs } from '@remix-run/node';
import { NavLink, Outlet, useLoaderData } from '@remix-run/react';

import { cx, Text } from '@colorstack/core-ui';

import { Route } from '../shared/constants';
import { countPastEvents, countUpcomingEvents } from '../shared/core.server';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const [pastEventsCount, upcomingEventsCount] = await Promise.all([
    countPastEvents(),
    countUpcomingEvents(),
  ]);

  return json({
    pastEventsCount,
    upcomingEventsCount,
  });
}

export default function EventsLayout() {
  const { pastEventsCount, upcomingEventsCount } =
    useLoaderData<typeof loader>();

  return (
    <>
      <Text variant="2xl">Events 📅</Text>

      <ul className="flex gap-4">
        <EventNavigationItem
          label={`Upcoming (${upcomingEventsCount})`}
          to={Route['/events/upcoming']}
        />
        <EventNavigationItem
          label={`Past (${pastEventsCount})`}
          to={Route['/events/past']}
        />
      </ul>
      <Outlet />
    </>
  );
}

type EventNavigationItemProps = {
  label: string;
  to: string;
};

function EventNavigationItem({ label, to }: EventNavigationItemProps) {
  return (
    <li>
      <NavLink
        className={({ isActive }) => {
          return cx(
            'hover:text-primary underline',
            isActive && 'text-primary underline'
          );
        }}
        to={to}
      >
        {label}
      </NavLink>
    </li>
  );
}
