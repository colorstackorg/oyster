import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import { listCompanyReviews } from '@oyster/core/employment.server';
import { listResources } from '@oyster/core/resources.server';
import { listSlackMessages } from '@oyster/core/slack.server';

import { getPointsLeaderboard } from '@/member-profile.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const dayObject = dayjs(params.date);

  if (!dayObject.isValid()) {
    throw new Response('Not a valid date.', { status: 400 });
  }

  const startOfWeek = dayObject.startOf('week').toDate();
  const endOfWeek = dayObject.endOf('week').toDate();

  const memberId = user(session);

  const [announcementMessages, topMessages, leaderboard, reviews, resources] =
    await Promise.all([
      listSlackMessages({
        include: ['reactions'],
        pagination: {
          page: 1,
          limit: 10,
        },
        select: ['messages.id', 'messages.text'],
        where: {
          channelId: '', // Announcements Channel ID
          sentAfter: startOfWeek,
          sentBefore: endOfWeek,
        },
      }),

      listSlackMessages({
        include: ['reactions'],
        select: ['messages.id', 'messages.text'],
        orderBy: 'most_reactions',
        pagination: {
          page: 1,
          limit: 10,
        },
        where: {
          sentAfter: startOfWeek,
          sentBefore: endOfWeek,
        },
      }),

      getPointsLeaderboard({
        limit: 50,
        where: {
          memberId,
          occurredAfter: startOfWeek,
          occurredBefore: endOfWeek,
        },
      }),

      listCompanyReviews({
        select: [
          'companyReviews.id',
          'companyReviews.rating',
          'companyReviews.recommend',
          'companyReviews.text',
        ],
        where: {
          postedAfter: startOfWeek,
          postedBefore: endOfWeek,
        },
      }),

      listResources({
        memberId: '',
        orderBy: 'newest',
        pagination: {
          limit: 1000,
          page: 1,
        },
        select: [
          'resources.description',
          'resources.id',
          'resources.link',
          'resources.title',
          'resources.type',
        ],
        where: {
          postedAfter: startOfWeek,
          postedBefore: endOfWeek,
          search: '',
          tags: [],
        },
      }),
    ]);

  return json({
    announcementMessages,
    leaderboard,
    resources,
    reviews,
    topMessages,
  });
}

export default function WeekInReviewPage() {
  return (
    <div>
      <AnnouncementMessages />
      <TopMessages />
      <Leaderboard />
      <Resources />
      <Reviews />
    </div>
  );
}

function AnnouncementMessages() {
  const { announcementMessages } = useLoaderData<typeof loader>();

  return null;
}

function Leaderboard() {
  const { leaderboard } = useLoaderData<typeof loader>();

  return null;
}

function Resources() {
  const { resources } = useLoaderData<typeof loader>();

  return null;
}

function Reviews() {
  const { resources } = useLoaderData<typeof loader>();

  return null;
}

function TopMessages() {
  const { topMessages } = useLoaderData<typeof loader>();

  return null;
}
