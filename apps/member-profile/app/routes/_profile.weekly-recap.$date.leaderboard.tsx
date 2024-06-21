import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { getPointsLeaderboard } from '@/member-profile.server';
import { getDateRange, RecapPage } from '@/routes/_profile.weekly-recap.$date';
import { Leaderboard } from '@/shared/components/leaderboard';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { endOfWeek, startOfWeek } = getDateRange(params.date);

  const leaderboard = await getPointsLeaderboard({
    limit: 25,
    where: {
      memberId: user(session),
      occurredAfter: startOfWeek,
      occurredBefore: endOfWeek,
    },
  });

  return json({
    leaderboard,
  });
}

export default function WeekInReviewPage() {
  const { leaderboard } = useLoaderData<typeof loader>();

  return (
    <RecapPage
      description="The top point earners in the ColorStack Family this week."
      title="Leaderboard 🏆"
    >
      <Leaderboard.List>
        {leaderboard.map((position) => {
          return (
            <Leaderboard.Item
              key={position.id}
              firstName={position.firstName}
              label={<LeaderboardItemLabel points={position.points} />}
              lastName={position.lastName}
              me={position.me}
              position={position.rank}
              profilePicture={position.profilePicture || undefined}
            />
          );
        })}
      </Leaderboard.List>
    </RecapPage>
  );
}

function LeaderboardItemLabel({ points }: { points: number }) {
  const formatter = Intl.NumberFormat('en-US');

  return (
    <Leaderboard.ItemLabel>
      {formatter.format(points)} <span className="text-sm"> Points</span>
    </Leaderboard.ItemLabel>
  );
}
