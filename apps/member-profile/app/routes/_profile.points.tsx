import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link as RemixLink,
  useLoaderData,
  useLocation,
  useSubmit,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { emojify } from 'node-emoji';
import { Award, Plus } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  getPointsLeaderboard,
  getTotalPoints,
  listActivities,
} from '@oyster/core/gamification';
import { type CompletedActivity } from '@oyster/core/gamification/types';
import { track } from '@oyster/core/mixpanel';
import { db } from '@oyster/db';
import {
  Button,
  cx,
  Link,
  Pill,
  Select,
  Text,
  useSearchParams,
} from '@oyster/ui';

import { Card, type CardProps } from '@/shared/components/card';
import {
  EmptyState,
  EmptyStateContainer,
} from '@/shared/components/empty-state';
import { Leaderboard } from '@/shared/components/leaderboard';
import { SlackMessage } from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const TIMEFRAME = {
  ALL_TIME: 'all_time',
  THIS_MONTH: 'this_month',
  THIS_WEEK: 'this_week',
  TODAY: 'today',
} as const;

const PointsSearchParams = z.object({
  historyLimit: z.coerce.number().min(1).max(100).catch(5),
  leaderboardLimit: z.coerce.number().min(1).max(1000).catch(10),
  timeframe: z.nativeEnum(TIMEFRAME).catch('this_week'),
  timezone: z.string().catch(''),
});

type PointsSearchParams = z.infer<typeof PointsSearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = PointsSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    timezone: getTimezone(request),
  });

  const occurredAfter = getTimeframeDate(
    searchParams.timeframe,
    searchParams.timezone
  );

  const id = user(session);

  const [
    { completedActivities: _completedActivities, totalActivitiesCompleted },
    points,
    pointsLeaderboard,
    activities,
  ] = await Promise.all([
    getActivityHistory(id, searchParams),
    getTotalPoints(id, {
      occurredAfter: getTimeframeDate(
        searchParams.timeframe,
        searchParams.timezone
      ),
    }),
    getPointsLeaderboard({
      limit: searchParams.leaderboardLimit,
      where: {
        memberId: id,
        occurredAfter,
        occurredBefore: null,
      },
    }),
    listActivities(),
  ]);

  track({
    event: 'Page Viewed',
    properties: { Page: 'Points' },
    request,
    user: id,
  });

  const completedActivities = _completedActivities.map((activity) => {
    if (activity.messageReactedToText) {
      activity.messageReactedToText = emojify(activity.messageReactedToText);
    }

    if (activity.threadRepliedToText) {
      activity.threadRepliedToText = emojify(activity.threadRepliedToText);
    }

    return activity;
  });

  return json({
    activities,
    completedActivities,
    points,
    pointsLeaderboard,
    student: { id },
    totalActivitiesCompleted,
  });
}

async function getActivityHistory(
  id: string,
  { historyLimit, timeframe, timezone }: PointsSearchParams
) {
  const occurredAfter = getTimeframeDate(timeframe, timezone);

  const query = db
    .selectFrom('completedActivities')
    .where('completedActivities.studentId', '=', id)
    .$if(!!occurredAfter, (eb) => {
      return eb.where('completedActivities.occurredAt', '>=', occurredAfter);
    });

  const [rows, countResult] = await Promise.all([
    query
      .leftJoin('activities', 'activities.id', 'completedActivities.activityId')
      .leftJoin('events', 'events.id', 'completedActivities.eventAttended')
      .leftJoin('slackMessages as threads', (join) => {
        return join
          .onRef('threads.id', '=', 'completedActivities.threadRepliedTo')
          .onRef('threads.channelId', '=', 'completedActivities.channelId');
      })
      .leftJoin('slackMessages as messagesReactedTo', (join) => {
        return join
          .onRef(
            'messagesReactedTo.id',
            '=',
            'completedActivities.messageReactedTo'
          )
          .onRef(
            'messagesReactedTo.channelId',
            '=',
            'completedActivities.channelId'
          );
      })
      .leftJoin(
        'students as opportunityBookmarkers',
        'opportunityBookmarkers.id',
        'completedActivities.opportunityBookmarkedBy'
      )
      .leftJoin(
        'students as resourceUpvoters',
        'resourceUpvoters.id',
        'completedActivities.resourceUpvotedBy'
      )
      .leftJoin(
        'resumeBooks',
        'resumeBooks.id',
        'completedActivities.resumeBookId'
      )
      .select([
        'activities.name',
        'completedActivities.censusYear',
        'completedActivities.description',
        'completedActivities.helpRequestId',
        'completedActivities.id',
        'completedActivities.occurredAt',
        'completedActivities.opportunityId',
        'completedActivities.points',
        'completedActivities.resourceId',
        'completedActivities.type',
        'events.name as eventAttended',
        'messagesReactedTo.channelId as messageReactedToChannelId',
        'messagesReactedTo.id as messageReactedToId',
        'messagesReactedTo.text as messageReactedToText',
        'opportunityBookmarkers.firstName as opportunityBookmarkerFirstName',
        'opportunityBookmarkers.id as opportunityBookmarkerId',
        'opportunityBookmarkers.lastName as opportunityBookmarkerLastName',
        'resourceUpvoters.firstName as resourceUpvoterFirstName',
        'resourceUpvoters.id as resourceUpvoterId',
        'resourceUpvoters.lastName as resourceUpvoterLastName',
        'resumeBooks.name as resumeBookName',
        'threads.channelId as threadRepliedToChannelId',
        'threads.id as threadRepliedToId',
        'threads.text as threadRepliedToText',
      ])
      .orderBy('completedActivities.occurredAt', 'desc')
      .limit(historyLimit)
      .execute(),

    query
      .select([(eb) => eb.fn.countAll<string>().as('count')])
      .executeTakeFirstOrThrow(),
  ]);

  const completedActivities = rows.map(({ occurredAt, ...row }) => {
    return {
      ...row,
      date: dayjs(occurredAt).tz(timezone).format('M/D/YY'),
    };
  });

  return {
    completedActivities,
    totalActivitiesCompleted: Number(countResult.count),
  };
}

function getTimeframeDate(
  timeframe: PointsSearchParams['timeframe'],
  timezone: string
): Date | null {
  const now = dayjs().tz(timezone);

  switch (timeframe) {
    case 'all_time':
      return null;

    case 'this_month':
      return now.startOf('month').toDate();

    case 'this_week':
      return now.startOf('week').toDate();

    case 'today':
      return now.startOf('day').toDate();
  }
}

export default function PointsPage() {
  return (
    <>
      <header className="flex justify-between gap-4">
        <Text variant="2xl">Points 🏆</Text>
        <TimeframeForm />
      </header>

      <div className="grid grid-cols-1 gap-6 @[900px]:grid-cols-2 @[1500px]:grid-cols-[1fr_1.5fr_1fr]">
        <PointsLeaderboard className="hidden @[1500px]:flex" />

        <div className="flex flex-col gap-[inherit] @container">
          <div className="grid grid-cols-1 gap-[inherit] @[560px]:grid-cols-2">
            <TotalPointsCard />
            <TotalActivitiesCompletedCard />
          </div>

          <ActivityHistory />
        </div>

        <div className="flex flex-col gap-[inherit]">
          <PointsLeaderboard className="@[1500px]:hidden" />
          <PointsRubric />
        </div>
      </div>
    </>
  );
}

const keys = PointsSearchParams.keyof().enum;

function TimeframeForm() {
  const [searchParams] = useSearchParams(PointsSearchParams);

  const submit = useSubmit();

  return (
    <Form
      className="flex min-w-[12rem] items-center gap-4"
      method="get"
      onChange={(e) => submit(e.currentTarget)}
    >
      <Select
        defaultValue={searchParams.timeframe}
        name={keys.timeframe}
        id={keys.timeframe}
        placeholder="Timeframe"
        required
      >
        <option value={TIMEFRAME.ALL_TIME}>All-Time</option>
        <option value={TIMEFRAME.THIS_MONTH}>This Month</option>
        <option value={TIMEFRAME.THIS_WEEK}>This Week</option>
        <option value={TIMEFRAME.TODAY}>Today</option>
      </Select>

      <input
        name={keys.leaderboardLimit}
        id={keys.leaderboardLimit}
        type="hidden"
        value={searchParams.leaderboardLimit}
      />
    </Form>
  );
}

function PointsLeaderboard({ className }: CardProps) {
  const { pointsLeaderboard } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams(PointsSearchParams);

  const submit = useSubmit();

  return (
    <Card className={cx('h-fit', className)}>
      <Card.Header>
        <Card.Title>Points Leaderboard</Card.Title>

        <Form
          className="flex min-w-[8rem]"
          method="get"
          onChange={(e) => submit(e.currentTarget)}
        >
          <Select
            defaultValue={searchParams.leaderboardLimit}
            name={keys.leaderboardLimit}
            id={keys.leaderboardLimit}
            required
          >
            <option value="10">Top 10</option>
            <option value="25">Top 25</option>
            <option value="50">Top 50</option>
            <option value="100">Top 100</option>
          </Select>

          <input
            name={keys.timeframe}
            id={keys.timeframe}
            type="hidden"
            value={searchParams.timeframe}
          />
        </Form>
      </Card.Header>

      <Card.Description>
        The top point earners in the ColorStack Family. Our community leaders
        and role models!
      </Card.Description>

      <Leaderboard.List scroll>
        {pointsLeaderboard.map((position) => {
          return (
            <Leaderboard.Item
              key={position.id}
              firstName={position.firstName}
              id={position.id}
              isMe={position.me}
              label={<LeaderboardItemLabel points={position.points} />}
              lastName={position.lastName}
              position={position.rank}
              profilePicture={position.profilePicture || undefined}
            />
          );
        })}
      </Leaderboard.List>
    </Card>
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

function TotalPointsCard() {
  const { points } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Total Points Earned</Card.Title>
      <Text variant="4xl">{points}</Text>
    </Card>
  );
}

function TotalActivitiesCompletedCard() {
  const { totalActivitiesCompleted } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Total Activities Completed</Card.Title>
      <Text variant="4xl">{totalActivitiesCompleted}</Text>
    </Card>
  );
}

function ActivityHistory() {
  const { completedActivities, totalActivitiesCompleted } =
    useLoaderData<typeof loader>();

  const [{ historyLimit, timeframe }] = useSearchParams(PointsSearchParams);
  const { search } = useLocation();

  const increaseLimitBy = 5;
  const searchParams = new URLSearchParams(search);

  searchParams.set('historyLimit', (historyLimit + increaseLimitBy).toString());

  return (
    <Card>
      <Text className="mb-2" variant="xl">
        Activity History
      </Text>

      {completedActivities.length ? (
        <>
          <ul className="flex flex-col gap-6">
            {completedActivities.map((activity) => {
              return (
                <ActivityHistoryItem key={activity.id} activity={activity} />
              );
            })}
          </ul>

          {completedActivities.length < totalActivitiesCompleted && (
            <Button.Slot
              className="mx-auto mt-8 w-[50%] min-w-[10rem]"
              variant="secondary"
            >
              <RemixLink to={{ search: searchParams.toString() }}>
                Show {increaseLimitBy} More
              </RemixLink>
            </Button.Slot>
          )}
        </>
      ) : (
        <EmptyStateContainer>
          <EmptyState icon={<Award />} />

          {match(timeframe)
            .with('all_time', () => {
              return (
                <>
                  <Text color="gray-500">
                    This is where you'll see a history of all the points you've
                    earned in the community. You'll also see some context on why
                    you got those points. Update your education and work history
                    so you can see what we're talking about!
                  </Text>

                  <Button.Group>
                    <Button.Slot variant="secondary">
                      <RemixLink to={Route['/profile/education/add']}>
                        <Plus /> Add Education
                      </RemixLink>
                    </Button.Slot>

                    <Button.Slot variant="secondary">
                      <RemixLink to={Route['/profile/work/add']}>
                        <Plus /> Add Work Experience
                      </RemixLink>
                    </Button.Slot>
                  </Button.Group>
                </>
              );
            })
            .otherwise(() => {
              return (
                <Text color="gray-500">
                  You haven't completed any activities in this timeframe.
                </Text>
              );
            })}
        </EmptyStateContainer>
      )}
    </Card>
  );
}

type CompletedActivityInView = SerializeFrom<
  typeof loader
>['completedActivities'][number];

function ActivityHistoryItem({
  activity,
}: {
  activity: CompletedActivityInView;
}) {
  const color = match(activity.points)
    .with(0, 1, () => 'amber-100' as const)
    .with(2, 3, () => 'pink-100' as const)
    .with(4, 5, () => 'blue-100' as const)
    .otherwise(() => 'lime-100' as const);

  return (
    <li className="grid grid-cols-[5rem_1fr] gap-4">
      <p className="ml-auto text-3xl text-green-700">+{activity.points}</p>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-500">{activity.date}</p>
        <ActivityHistoryItemDescription activity={activity} />
        {activity.name && <Pill color={color}>{activity.name}</Pill>}
      </div>
    </li>
  );
}

function ActivityHistoryItemDescription({
  activity,
}: {
  activity: CompletedActivityInView;
}) {
  const type = activity.type as CompletedActivity['type'];

  return match(type)
    .with('attend_event', () => {
      return <p>You attended an event: {activity.eventAttended}.</p>;
    })
    .with('get_activated', () => {
      return <p>You became activated.</p>;
    })
    .with('get_opportunity_bookmark', () => {
      return (
        <p>
          <RemixLink
            className="link"
            to={generatePath(Route['/directory/:id'], {
              id: activity.opportunityBookmarkerId,
            })}
          >
            {activity.opportunityBookmarkerFirstName}{' '}
            {activity.opportunityBookmarkerLastName}
          </RemixLink>{' '}
          bookmarked an{' '}
          <RemixLink
            className="link"
            to={generatePath(Route['/opportunities/:id'], {
              id: activity.opportunityId,
            })}
          >
            opportunity
          </RemixLink>{' '}
          you posted.
        </p>
      );
    })
    .with('get_resource_upvote', () => {
      return (
        <p>
          <RemixLink
            className="link"
            to={generatePath(Route['/directory/:id'], {
              id: activity.resourceUpvoterId,
            })}
          >
            {activity.resourceUpvoterFirstName}{' '}
            {activity.resourceUpvoterLastName}
          </RemixLink>{' '}
          upvoted a{' '}
          <RemixLink
            className="link"
            to={{
              pathname: Route['/resources'],
              search: `id=${activity.resourceId}`,
            }}
          >
            resource
          </RemixLink>{' '}
          you posted.
        </p>
      );
    })
    .with('help_peer', () => {
      return (
        <p>
          You{' '}
          <RemixLink
            className="link"
            to={generatePath(Route['/peer-help/:id'], {
              id: activity.helpRequestId,
            })}
          >
            helped a peer
          </RemixLink>
          .
        </p>
      );
    })
    .with('join_member_directory', () => {
      return <p>You joined the Member Directory.</p>;
    })
    .with('one_off', () => {
      return (
        <div className="flex flex-col gap-2">
          <p>You completed a one-off activity.</p>

          <div className="flex gap-2">
            <div className="border-r-2 border-r-gray-300" />
            <Text color="gray-500">{activity.description}</Text>
          </div>
        </div>
      );
    })
    .with('post_resource', () => {
      return (
        <p>
          You posted a{' '}
          <RemixLink
            className="link"
            to={{
              pathname: Route['/resources'],
              search: `id=${activity.resourceId}`,
            }}
          >
            resource
          </RemixLink>
          .
        </p>
      );
    })
    .with('react_to_message', () => {
      const href = `https://colorstack-family.slack.com/archives/${activity.messageReactedToChannelId}/p${activity.messageReactedToId}`;

      return (
        <div className="flex flex-col gap-2">
          <p>
            You reacted to a Slack{' '}
            <Link href={href} target="_blank">
              message
            </Link>
            .
          </p>

          <div className="flex gap-2">
            <div className="border-r-2 border-r-gray-300" />

            <SlackMessage className="line-clamp-10" color="gray-500">
              {activity.messageReactedToText}
            </SlackMessage>
          </div>
        </div>
      );
    })
    .with('refer_friend', () => {
      return <p>You referred a friend to ColorStack.</p>;
    })
    .with('reply_to_thread', () => {
      const href = `https://colorstack-family.slack.com/archives/${activity.threadRepliedToChannelId}/p${activity.threadRepliedToId}`;

      return (
        <div className="flex flex-col gap-2">
          <p>
            You replied to a{' '}
            <Link href={href} target="_blank">
              thread
            </Link>
            .
          </p>

          <div className="flex gap-2">
            <div className="border-r-2 border-r-gray-300" />

            <SlackMessage
              className="line-clamp-10 [word-break:break-word]"
              color="gray-500"
            >
              {activity.threadRepliedToText}
            </SlackMessage>
          </div>
        </div>
      );
    })
    .with('review_company', () => {
      return <p>You reviewed a work experience.</p>;
    })
    .with('submit_census_response', () => {
      return (
        <p>You submitted a response to the Census ({activity.censusYear}).</p>
      );
    })
    .with('submit_resume', () => {
      return (
        <p>
          You submitted your resume to the "{activity.resumeBookName}" Resume
          Book.
        </p>
      );
    })
    .with('upload_profile_picture', () => {
      return <p>You uploaded a profile picture.</p>;
    })
    .otherwise(() => {
      return <p>You completed an activity.</p>;
    });
}

function PointsRubric() {
  const { activities } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Points Rubric</Card.Title>

      {activities.map((activity) => {
        return (
          <div key={activity.id}>
            <Text weight="500">
              {activity.name}{' '}
              <span className="text-green-700">(+{activity.points})</span>
            </Text>

            <Text color="gray-500">{activity.description}</Text>
          </div>
        );
      })}
    </Card>
  );
}

export function ErrorBoundary() {
  return <></>;
}

// Progress Bar
// Daily
// Chart
