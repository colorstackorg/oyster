import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { Text } from '@oyster/ui';

import { countPastEvents, countUpcomingEvents } from '@/member-profile.server';
import { NavigationItem } from '@/shared/components/navigation';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

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
        <NavigationItem to={Route['/events/upcoming']}>
          Upcoming ({upcomingEventsCount})
        </NavigationItem>

        <NavigationItem to={Route['/events/past']}>
          Past ({pastEventsCount})
        </NavigationItem>
      </ul>
      <Outlet />
    </>
  );
}
