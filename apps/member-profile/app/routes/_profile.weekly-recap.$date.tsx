import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  Outlet,
  useLoaderData,
  useParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';

import { listCompanyReviews } from '@oyster/core/employment.server';
import { listResources } from '@oyster/core/resources.server';
import { listSlackMessages } from '@oyster/core/slack.server';
import { Divider, Text } from '@oyster/ui';
import { iife } from '@oyster/utils';

import { listMembersInDirectory } from '@/member-profile.server';
import { NavigationItem } from '@/shared/components/navigation';
import { type Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export function getDateRange(date: unknown) {
  const dayObject = dayjs(date as string);

  return {
    startOfWeek: dayObject.startOf('week').toDate(),
    endOfWeek: dayObject.endOf('week').toDate(),
  };
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const dayObject = dayjs(params.date);

  if (!dayObject.isValid()) {
    throw new Response('Not a valid date.', { status: 400 });
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
      select: ['messages.id'],
      where: {
        channelId: '', // Announcements Channel ID
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
        location: null,
        locationLatitude: null,
        locationLongitude: null,
        school: null,
        search: '',
      },
    }),

    listCompanyReviews({
      select: ['companyReviews.id'],
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

  return json({
    dateRange,
    totalAnnouncements: announcements.length,
    totalMembers,
    totalResources,
    totalReviews: reviews.length,
  });
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
          <RecapNavigationItem to="/weekly-recap/:date/leaderboard">
            Leaderboard
          </RecapNavigationItem>

          <RecapNavigationItem to="/weekly-recap/:date/announcements">
            Announcements ({totalAnnouncements})
          </RecapNavigationItem>

          <RecapNavigationItem to="/weekly-recap/:date/resources">
            Resources ({totalResources})
          </RecapNavigationItem>

          <RecapNavigationItem to="/weekly-recap/:date/reviews">
            Company Reviews ({totalReviews})
          </RecapNavigationItem>

          <RecapNavigationItem to="/weekly-recap/:date/members">
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

// Shared

type RecapSectionProps = PropsWithChildren<{
  description: React.ReactNode;
  title: React.ReactNode;
}>;

export function RecapPage({ children, description, title }: RecapSectionProps) {
  return (
    <section className="flex flex-col gap-[inherit]">
      <header className="flex flex-col gap-1">
        <Text variant="xl">{title}</Text>
        <Text color="gray-500">{description}</Text>
      </header>

      {children}
    </section>
  );
}
