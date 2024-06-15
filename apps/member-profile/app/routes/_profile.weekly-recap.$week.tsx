import { json, type LoaderFunctionArgs } from '@remix-run/node';
import dayjs from 'dayjs';

import { listCompanyReviews } from '@oyster/core/employment.server';
import { listResources } from '@oyster/core/resources.server';

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

  const [leaderboard, reviews, resources] = await Promise.all([
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
    leaderboard,
    resources,
    reviews,
  });
}

export default function WeekInReviewPage() {
  return null;
}
