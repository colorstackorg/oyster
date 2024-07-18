import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  isRouteErrorResponse,
  Outlet,
  useLoaderData,
  useParams,
  useRouteError,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';

import { listCompanyReviews } from '@oyster/core/employment.server';
import { listResources } from '@oyster/core/resources.server';
import { listSlackMessages } from '@oyster/core/slack.server';
import { track } from '@oyster/core/mixpanel';
import { Divider, Text } from '@oyster/ui';
import { iife } from '@oyster/utils';

import { listMembersInDirectory } from '@/member-profile.server';
import { NavigationItem } from '@/shared/components/navigation';
import { type Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const dayObject = dayjs(params.date);

  if (!dayObject.isValid()) {
    throw new Response('Not a valid date.', { status: 400 });
  }

  if (dayObject.isAfter(dayjs().subtract(1, 'week').endOf('week'))) {
    throw new Response('Must be a week in the past.', { status: 400 });
  }

  if (dayObject.isBefore(dayjs().subtract(1, 'year'))) {
    throw new Response('Must be a week in the last year.', { status: 400 });
  }

  const { endOfWeek, startOfWeek } = getDateRange(params.date);

  const [
    announcements,
    { totalCount: totalMembers },
    reviews,
    { totalCount: totalResources },
  ] = await Promise.all([
    listSlackMessages({
      pagination: { page: 1, limit: 10 },
      where: {
        channelId: ENV.SLACK_ANNOUNCEMENTS_CHANNEL_ID,
        threadId: null,
        sentAfter: startOfWeek,
        sentBefore: endOfWeek,
      },
    }),

    listMembersInDirectory({
      limit: 1,
      page: 1,
      where: {
        company: null,
        ethnicity: null,
        graduationYear: null,
        hometown: null,
        hometownLatitude: null,
        hometownLongitude: null,
        joinedDirectoryAfter: startOfWeek,
        joinedDirectoryBefore: endOfWeek,
        location: null,
        locationLatitude: null,
        locationLongitude: null,
        school: null,
        search: '',
      },
    }),

    listCompanyReviews({
      select: [],
      where: {
        postedAfter: startOfWeek,
        postedBefore: endOfWeek,
      },
    }),

    listResources({
      memberId: '',
      pagination: { limit: 1, page: 1 },
      orderBy: 'newest',
      select: [],
      where: {
        postedAfter: startOfWeek,
        postedBefore: endOfWeek,
        search: '',
        tags: [],
      },
    }),
  ]);

  const dateRange = iife(() => {
    const format = 'dddd, MMMM D, YYYY';

    const startRange = dayObject.startOf('week').format(format);
    const endRange = dayObject.endOf('week').format(format);

    return `${startRange} - ${endRange}`;
  });

  track({
    event: 'Page Viewed',
    properties: { Page: 'Last Week in ColorStack' },
    request,
    user: user(session),
  });

  return json({
    dateRange,
    totalAnnouncements: announcements.length,
    totalMembers,
    totalResources,
    totalReviews: reviews.length,
  });
}

export function getDateRange(date: unknown) {
  const dayObject = dayjs(date as string);

  return {
    startOfWeek: dayObject.startOf('week').toDate(),
    endOfWeek: dayObject.endOf('week').toDate(),
  };
}

export default function WeekInReviewLayout() {
  const {
    dateRange,
    totalAnnouncements,
    totalMembers,
    totalResources,
    totalReviews,
  } = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-4 @container">
      <header>
        <Text variant="2xl">Last Week in ColorStack</Text>
        <Text color="gray-500">{dateRange}</Text>
      </header>

      <nav>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          <RecapNavigationItem to="/recap/:date/leaderboard">
            Leaderboard
          </RecapNavigationItem>

          <RecapNavigationItem to="/recap/:date/announcements">
            Announcements ({totalAnnouncements})
          </RecapNavigationItem>

          <RecapNavigationItem to="/recap/:date/resources">
            Resources ({totalResources})
          </RecapNavigationItem>

          <RecapNavigationItem to="/recap/:date/reviews">
            Company Reviews ({totalReviews})
          </RecapNavigationItem>

          <RecapNavigationItem to="/recap/:date/members">
            Members ({totalMembers})
          </RecapNavigationItem>
        </ul>
      </nav>

      <Divider my="2" />
      <Outlet />
    </section>
  );
}

function RecapNavigationItem({
  children,
  to,
}: PropsWithChildren<{ to: Route }>) {
  const { date } = useParams();

  return (
    <NavigationItem to={generatePath(to as string, { date })}>
      {children}
    </NavigationItem>
  );
}

// Error Boundary

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <Text>
        {error.status}: {error.data}
      </Text>
    );
  }

  return null;
}

// Shared

export const Recap = ({ children }: PropsWithChildren) => {
  return <section className="flex flex-col gap-[inherit]">{children}</section>;
};

Recap.Description = function Description({ children }: PropsWithChildren) {
  return <Text color="gray-500">{children}</Text>;
};

Recap.Header = function Header({ children }: PropsWithChildren) {
  return <header className="flex flex-col gap-1">{children}</header>;
};

Recap.Title = function Title({ children }: PropsWithChildren) {
  return <Text variant="xl">{children}</Text>;
};
