import { json, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import {
  Form as RemixForm,
  Link as RemixLink,
  useLoaderData,
  useLocation,
  useSubmit,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { sql } from 'kysely';
import { PropsWithoutRef } from 'react';
import { Award, Plus } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { CompletedActivity, Student } from '@oyster/types';
import {
  Button,
  cx,
  getButtonCn,
  Link,
  Pill,
  ProfilePicture,
  Select,
  Text,
  useSearchParams,
} from '@oyster/ui';

import { Card } from '../shared/components/card';
import {
  EmptyState,
  EmptyStateContainer,
} from '../shared/components/empty-state';
import { Route } from '../shared/constants';
import { getTimezone } from '../shared/cookies.server';
import { db, getTotalPoints } from '../shared/core.server';
import { track } from '../shared/mixpanel.server';
import { ensureUserAuthenticated, user } from '../shared/session.server';

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

const PointsSearchParam = PointsSearchParams.keyof().enum;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = PointsSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    timezone: getTimezone(request),
  });

  const id = user(session);

  const [
    { completedActivities, totalActivitiesCompleted },
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
    getPointsLeaderboard(id, searchParams),
    listActivities(),
  ]);

  track(request, 'Page Viewed', {
    Page: 'Points',
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

const LeaderboardPosition = Student.pick({
  firstName: true,
  id: true,
  lastName: true,
  profilePicture: true,
}).extend({
  me: z.coerce.boolean(),
  points: z.coerce.number().min(0),
  rank: z.coerce.number().min(1),
});

async function getPointsLeaderboard(
  id: string,
  { leaderboardLimit, timeframe, timezone }: PointsSearchParams
) {
  const occurredAfter = getTimeframeDate(timeframe, timezone);

  const rows = await db
    .with('positions', (db) => {
      return db
        .selectFrom('completedActivities')
        .select([(eb) => eb.fn.sum<string>('points').as('points'), 'studentId'])
        .$if(!!occurredAfter, (eb) => {
          return eb.where('occurredAt', '>=', occurredAfter);
        })
        .groupBy('studentId')
        .orderBy('points', 'desc')
        .limit(leaderboardLimit);
    })
    .selectFrom('positions')
    .leftJoin('students', 'students.id', 'positions.studentId')
    .select([
      'positions.points',
      'students.id',
      'students.firstName',
      'students.lastName',
      'students.profilePicture',
      sql<boolean>`students.id = ${id}`.as('me'),
      sql<string>`rank() over (order by positions.points desc)`.as('rank'),
    ])
    .orderBy('points', 'desc')
    .orderBy('createdAt', 'desc')
    .execute();

  const leaderboard = LeaderboardPosition.array().parse(rows);

  return leaderboard;
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
      .leftJoin(
        'surveys',
        'surveys.id',
        'completedActivities.surveyRespondedTo'
      )
      .leftJoin(
        'slackMessages as threads',
        'threads.id',
        'completedActivities.threadRepliedTo'
      )
      .leftJoin(
        'slackMessages as messagesReactedTo',
        'messagesReactedTo.id',
        'completedActivities.messageReactedTo'
      )
      .select([
        'activities.name',
        'completedActivities.description',
        'completedActivities.id',
        'completedActivities.occurredAt',
        'completedActivities.points',
        'completedActivities.type',
        'events.name as eventAttended',
        'messagesReactedTo.channelId as messageReactedToChannelId',
        'messagesReactedTo.id as messageReactedToId',
        'messagesReactedTo.text as messageReactedToText',
        'surveys.title as surveyRespondedTo',
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

async function listActivities() {
  const activities = await db
    .selectFrom('activities')
    .select(['description', 'id', 'name', 'period', 'points', 'type'])
    .where('deletedAt', 'is', null)
    .orderBy('points', 'asc')
    .execute();

  return activities;
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

function TimeframeForm() {
  const [searchParams] = useSearchParams(PointsSearchParams);

  const submit = useSubmit();

  return (
    <RemixForm
      className="flex min-w-[12rem] items-center gap-4"
      method="get"
      onChange={(e) => submit(e.currentTarget)}
    >
      <Select
        defaultValue={searchParams.timeframe}
        name={PointsSearchParam.timeframe}
        id={PointsSearchParam.timeframe}
        placeholder="Timeframe"
        required
      >
        <option value={TIMEFRAME.ALL_TIME}>All-Time</option>
        <option value={TIMEFRAME.THIS_MONTH}>This Month</option>
        <option value={TIMEFRAME.THIS_WEEK}>This Week</option>
        <option value={TIMEFRAME.TODAY}>Today</option>
      </Select>

      <input
        name={PointsSearchParam.leaderboardLimit}
        id={PointsSearchParam.leaderboardLimit}
        type="hidden"
        value={searchParams.leaderboardLimit}
      />
    </RemixForm>
  );
}

function PointsLeaderboard({
  className,
}: PropsWithoutRef<{ className?: string }>) {
  const { pointsLeaderboard } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams(PointsSearchParams);

  const submit = useSubmit();

  return (
    <Card className={cx('h-fit', className)}>
      <div className="flex justify-between gap-4">
        <Card.Title>Points Leaderboard</Card.Title>

        <RemixForm
          className="flex min-w-[8rem]"
          method="get"
          onChange={(e) => submit(e.currentTarget)}
        >
          <Select
            defaultValue={searchParams.leaderboardLimit}
            name={PointsSearchParam.leaderboardLimit}
            id={PointsSearchParam.leaderboardLimit}
            required
          >
            <option value="10">Top 10</option>
            <option value="25">Top 25</option>
            <option value="50">Top 50</option>
            <option value="100">Top 100</option>
          </Select>

          <input
            name={PointsSearchParam.timeframe}
            id={PointsSearchParam.timeframe}
            type="hidden"
            value={searchParams.timeframe}
          />
        </RemixForm>
      </div>

      <Card.Description>
        The top point earners in the ColorStack Family. Our community leaders
        and role models!
      </Card.Description>

      <ul className="flex max-h-[800px] flex-col gap-4 overflow-scroll">
        {pointsLeaderboard.map((position, i) => {
          return (
            <LeaderboardPositionItem
              key={position.id}
              i={i}
              position={position}
            />
          );
        })}
      </ul>
    </Card>
  );
}

type LeaderboardPositionItemProps = {
  i?: number;
  position: SerializeFrom<typeof loader>['pointsLeaderboard'][number];
};

function LeaderboardPositionItem({ position }: LeaderboardPositionItemProps) {
  const formattedPoints = Intl.NumberFormat('en-US').format(position.points);

  const formattedPosition = Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(position.rank);

  return (
    <li
      className="grid grid-cols-[3rem_4fr_2fr] items-center"
      key={position.id}
    >
      <Text className="ml-auto mr-4" color="gray-500" weight="500">
        {formattedPosition}
      </Text>

      <div className="flex items-center gap-2">
        <ProfilePicture
          initials={position.firstName[0] + position.lastName[0]}
          src={position.profilePicture || undefined}
        />

        <Text className="line-clamp-1" weight={position.me ? '600' : undefined}>
          {position.firstName}{' '}
          <span className="hidden sm:inline">{position.lastName}</span>
          <span className="inline sm:hidden">{position.lastName[0]}.</span>{' '}
          {position.me && '(You)'}
        </Text>
      </div>

      <Text className="text-right">
        {formattedPoints} <span className="text-sm"> Points</span>
      </Text>
    </li>
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
            <RemixLink
              className={cx(
                getButtonCn({ variant: 'secondary' }),
                'mx-auto mt-8 w-[50%] min-w-[10rem]'
              )}
              to={{ search: searchParams.toString() }}
            >
              Show {increaseLimitBy} More
            </RemixLink>
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
                    <RemixLink
                      to={Route.ADD_EDUCATION}
                      className={getButtonCn({ variant: 'secondary' })}
                    >
                      <Plus /> Add Education
                    </RemixLink>

                    <RemixLink
                      to={Route.ADD_WORK_EXPERIENCE}
                      className={getButtonCn({ variant: 'secondary' })}
                    >
                      <Plus /> Add Work Experience
                    </RemixLink>
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

            <Text
              className="line-clamp-5 whitespace-pre-wrap [word-break:break-word]"
              color="gray-500"
            >
              {activity.messageReactedToText}
            </Text>
          </div>
        </div>
      );
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

            <Text
              className="line-clamp-5 whitespace-pre-wrap [word-break:break-word]"
              color="gray-500"
            >
              {activity.threadRepliedToText}
            </Text>
          </div>
        </div>
      );
    })
    .with('respond_to_survey', () => {
      return <p>You responded to a survey: "{activity.surveyRespondedTo}"</p>;
    })
    .with('update_education_history', () => {
      return <p>You added an education experience.</p>;
    })
    .with('update_work_history', () => {
      return <p>You added a work experience.</p>;
    })
    .with('upload_profile_picture', () => {
      return <p>You uploaded a profile picture.</p>;
    })
    .exhaustive();
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
