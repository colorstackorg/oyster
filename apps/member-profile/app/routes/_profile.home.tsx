import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';
import {
  ExternalLink,
  GitHub,
  type Icon,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from 'react-feather';
import { match } from 'ts-pattern';

import { countEventAttendees } from '@oyster/core/events/attendees';
import {
  countMessagesSent,
  getActiveStreakLeaderboard,
} from '@oyster/core/member-profile/server';
import { getIpAddress, setMixpanelProfile, track } from '@oyster/core/mixpanel';
import { db } from '@oyster/db';
import {
  ACTIVATION_REQUIREMENTS,
  type ActivationRequirement,
  StudentActiveStatus,
  Timezone,
} from '@oyster/types';
import { Button, cx, Divider, Text } from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Card, type CardProps } from '@/shared/components/card';
import { Leaderboard } from '@/shared/components/leaderboard';
import { MemberProfileTour } from '@/shared/components/member-profile-tour';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const RECENT_WEEKS = 16;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const timezone = Timezone.parse(getTimezone(request));

  const [
    leaderboard,
    student,
    eventsAttendedCount,
    messagesSentCount,
    _statuses,
    thisWeekActiveStatus,
    totalStudentsCount,
  ] = await Promise.all([
    getActiveStreakLeaderboard(),
    getStudent(id),
    countEventAttendees({ studentId: id }),
    countMessagesSent(id),
    getRecentActiveStatuses(id, timezone),
    getThisWeekActiveStatus(id, timezone),
    getTotalStudentsCount(),
  ]);

  const statuses = fillRecentStatuses(_statuses, timezone);

  setMixpanelProfile(id, {
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
    ip: getIpAddress(request),
  });

  track({
    event: 'Page Viewed',
    properties: { Page: 'Home' },
    request,
    user: id,
  });

  return json({
    eventsAttendedCount,
    leaderboard,
    messagesSentCount,
    statuses,
    student,
    thisWeekActiveStatus,
    totalStudentsCount,
  });
}

async function getRecentActiveStatuses(id: string, timezone: string) {
  const since = dayjs()
    .tz(timezone)
    .startOf('week')
    .subtract(RECENT_WEEKS - 1, 'week')
    .toDate();

  const _rows = await db
    .selectFrom('studentActiveStatuses')
    .select(['date', 'status'])
    .where('studentId', '=', id)
    .where('date', '>=', since)
    .orderBy('date', 'asc')
    .limit(RECENT_WEEKS)
    .execute();

  const rows = _rows.map((row) => {
    return {
      date: row.date.toISOString(),
      status: StudentActiveStatus.shape.status.parse(row.status),
    };
  });

  return rows;
}

/**
 * Returns the last `RECENT_WEEKS` weeks of statuses for a member.
 *
 * Some members haven't been around for `RECENT_WEEKS` weeks, so instead of
 * showing them less than `RECENT_WEEKS` statuses, we'll show them empty (gray)
 * statuses for the weeks they weren't around.
 */
function fillRecentStatuses(
  statuses: Pick<StudentActiveStatus, 'date' | 'status'>[],
  timezone: string
) {
  // If all recent statuses are present, then no need to do the "filling"
  // operation, we'll just format it.
  if (statuses.length === RECENT_WEEKS) {
    return statuses;
  }

  const startOfThisWeekObject = dayjs().tz(timezone).startOf('week');

  const result = Array(RECENT_WEEKS)
    .fill(0)
    .map((_, i) => {
      const currentWeekObject = startOfThisWeekObject
        .subtract(RECENT_WEEKS - i, 'week')
        .startOf('week');

      const status = statuses.find((status) => {
        return dayjs(status.date).isSame(
          currentWeekObject.add(1, 'week'),
          'date'
        );
      });

      return {
        date: currentWeekObject.toISOString(),
        status: status?.status,
      };
    });

  return result;
}

async function getStudent(id: string) {
  const row = await db
    .selectFrom('students')
    .select([
      'acceptedAt',
      'activatedAt',
      'activationRequirementsCompleted',
      'claimedSwagPackAt',
      'email',
      'firstName',
      'id',
      'lastName',
      'number',
      'onboardedAt',
    ])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  const joinedAfterActivation =
    row.acceptedAt.valueOf() >=
    dayjs().year(2023).month(5).date(9).startOf('day').toDate().valueOf();

  row.activationRequirementsCompleted =
    row.activationRequirementsCompleted.filter((requirement) => {
      return ACTIVATION_REQUIREMENTS.includes(
        requirement as ActivationRequirement
      );
    });

  return Object.assign(row, { joinedAfterActivation });
}

async function getThisWeekActiveStatus(id: string, timezone: string) {
  const startOfWeekObject = dayjs().tz(timezone).startOf('week');
  const startOfWeekDate = startOfWeekObject.toDate();

  const endOfWeekObject = startOfWeekObject.endOf('week');
  const endOfWeekDate = endOfWeekObject.toDate();

  const [messageRow, reactionRow] = await Promise.all([
    db
      .selectFrom('slackMessages')
      .where('studentId', '=', id)
      .where('createdAt', '>=', startOfWeekDate)
      .where('createdAt', '<=', endOfWeekDate)
      .where('deletedAt', 'is', null)
      .limit(1)
      .executeTakeFirst(),

    db
      .selectFrom('slackReactions')
      .where('studentId', '=', id)
      .where('createdAt', '>=', startOfWeekDate)
      .where('createdAt', '<=', endOfWeekDate)
      .limit(1)
      .executeTakeFirst(),
  ]);

  const status: StudentActiveStatus['status'] =
    messageRow || reactionRow ? 'active' : 'inactive';

  return status;
}

async function getTotalStudentsCount() {
  const row = await db
    .selectFrom('students')
    .select((eb) => eb.fn.countAll().as('count'))
    .executeTakeFirstOrThrow();

  const count = Number(row.count);

  return count;
}

export default function HomeLayout() {
  const { student } = useLoaderData<typeof loader>();

  const showActivationCard =
    !!student.joinedAfterActivation &&
    !student.activatedAt &&
    !student.claimedSwagPackAt;

  const showOnboardingCard =
    !!student.joinedAfterActivation && !student.onboardedAt;

  return (
    <>
      <Text variant="2xl">Hey, {student.firstName}! 👋</Text>

      {(showActivationCard || showOnboardingCard) && (
        <>
          <div className="grid grid-cols-1 items-start gap-4 @[1000px]:grid-cols-2 @[1500px]:grid-cols-3">
            {showActivationCard && <ActivationCard />}
            {showOnboardingCard && <OnboardingSessionCard />}
          </div>

          <Divider />
        </>
      )}

      <div className="grid grid-cols-1 items-start gap-4 @[900px]:grid-cols-2 @[1500px]:grid-cols-3">
        <Home.Column>
          <ActiveStatusCard />

          <div className="gap-[inherit] @container">
            <div className="grid grid-cols-1 gap-[inherit] @[420px]:grid-cols-2">
              <MemberNumberCard />
              <TotalCommunityMemberCard />
              <EventsAttendedCard />
              <MessagesSentCard />
            </div>
          </div>

          <LeaderboardCard className="@[1500px]:hidden" />
        </Home.Column>

        <Home.Column className="hidden @[1500px]:flex">
          <LeaderboardCard />
        </Home.Column>

        <Home.Column>
          <ImportantResourcesCard />
          <SocialsCard />
          <MerchStoreCard />
        </Home.Column>
      </div>

      <MemberProfileTour />
      <Outlet />
    </>
  );
}

function ActiveStatusCard() {
  const { statuses, thisWeekActiveStatus } = useLoaderData<typeof loader>();

  const thisWeekStartDate = dayjs().startOf('week').format('M/D');
  const thisWeekEndDate = dayjs().endOf('week').format('M/D');

  return (
    <Card>
      <Card.Title>Active Status</Card.Title>

      <Card.Description>
        You are considered active in a week if you have either sent a Slack
        message or reacted to a Slack message, in that week.
      </Card.Description>

      <div className="mt-4 flex flex-col justify-evenly gap-4 sm:flex-row">
        <div className="flex flex-col gap-2">
          <Text weight="500">
            This Week ({thisWeekStartDate} - {thisWeekEndDate})
          </Text>

          <Text
            color={thisWeekActiveStatus === 'active' ? 'success' : 'error'}
            variant="xl"
          >
            <span
              className={cx(
                'inline-block h-2 w-2 rounded-full align-middle',
                thisWeekActiveStatus === 'active' ? 'bg-success' : 'bg-error'
              )}
            />{' '}
            {toTitleCase(thisWeekActiveStatus)}
          </Text>
        </div>

        <div className="border border-gray-100" />

        <div className="flex flex-col gap-2">
          <Text weight="500">Last {statuses.length} Weeks</Text>

          <div className="grid w-fit grid-cols-8 gap-2">
            {statuses.map((status) => {
              const className = match(status.status)
                .with('active', () => 'bg-success')
                .with('inactive', () => 'bg-error')
                .with(undefined, () => 'bg-gray-200')
                .exhaustive();

              return (
                <div
                  className={cx('h-4 w-4 rounded-[0.125rem]', className)}
                  key={status.date}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function OnboardingSessionCard() {
  return (
    <Card>
      <Card.Title>Attend an Onboarding Session 📆</Card.Title>

      <Card.Description>
        Attend an onboarding session to learn more about ColorStack and meet
        other members!
      </Card.Description>

      <Button.Group>
        <Button.Slot variant="primary">
          <Link
            target="_blank"
            to="https://calendly.com/colorstack-onboarding-ambassador/onboarding"
          >
            Book Onboarding Session <ExternalLink size={20} />
          </Link>
        </Button.Slot>
      </Button.Group>
    </Card>
  );
}

function ActivationCard() {
  const { student } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Activation ✅</Card.Title>

      <Card.Description>
        You've completed {student.activationRequirementsCompleted.length}/
        {ACTIVATION_REQUIREMENTS.length} activation requirements. Once you hit
        all {ACTIVATION_REQUIREMENTS.length}, you will get a gift card to claim
        your FREE merch! 👀
      </Card.Description>

      <Button.Group>
        <Button.Slot variant="primary">
          <Link to={Route['/home/activation']}>See Progress</Link>
        </Button.Slot>
      </Button.Group>
    </Card>
  );
}

function MessagesSentCard() {
  const { messagesSentCount } = useLoaderData<typeof loader>();

  const value = messagesSentCount.toLocaleString('en-US');

  return (
    <Card className="flex-1">
      <Card.Title>Messages Sent</Card.Title>
      <Text variant="4xl">{value}</Text>
    </Card>
  );
}

function EventsAttendedCard() {
  const { eventsAttendedCount } = useLoaderData<typeof loader>();

  return (
    <Card className="flex-1">
      <Card.Title>Events Attended</Card.Title>
      <Text variant="4xl">{eventsAttendedCount}</Text>
    </Card>
  );
}

function MemberNumberCard() {
  const { student } = useLoaderData<typeof loader>();

  return (
    <Card className="flex-1">
      <Card.Title>Member #</Card.Title>
      <Text variant="4xl">{student.number}</Text>
    </Card>
  );
}

function TotalCommunityMemberCard() {
  const { totalStudentsCount } = useLoaderData<typeof loader>();

  const value = totalStudentsCount.toLocaleString('en-US');

  return (
    <Card className="flex-1">
      <Card.Title>Total Members</Card.Title>
      <Text variant="4xl">{value}</Text>
    </Card>
  );
}

function LeaderboardCard({ className }: CardProps) {
  const { leaderboard, student } = useLoaderData<typeof loader>();

  return (
    <Card className={cx('flex-1', className)}>
      <Card.Title>Active Streak Leaderboard</Card.Title>

      <Card.Description>
        You are considered active in a week if you have either sent a Slack
        message or reacted to a Slack message, in that week.
      </Card.Description>

      <Leaderboard.List>
        {leaderboard.map((position) => {
          return (
            <Leaderboard.Item
              key={position.id}
              firstName={position.firstName}
              id={position.id}
              isMe={position.id === student.id}
              label={<LeaderboardItemLabel weeks={position.value} />}
              lastName={position.lastName}
              position={position.position}
              profilePicture={position.profilePicture || undefined}
            />
          );
        })}
      </Leaderboard.List>
    </Card>
  );
}

function LeaderboardItemLabel({ weeks }: { weeks: number }) {
  return (
    <Leaderboard.ItemLabel>
      {weeks}
      <span className="hidden text-sm sm:inline"> Weeks</span>
      <span className="inline text-sm sm:hidden">w</span>
    </Leaderboard.ItemLabel>
  );
}

function ImportantResourcesCard() {
  return (
    <Card>
      <Card.Title>Important Resources</Card.Title>

      <ul className="flex flex-col gap-3">
        <ResourceItem
          description="The heartbeat of our community."
          href="https://colorstack-family.slack.com/"
        >
          Slack
        </ResourceItem>

        <ResourceItem
          description="A collection of career, community, and academic related resources."
          href="https://wiki.colorstack.org/the-colorstack-family"
        >
          Member Wiki
        </ResourceItem>

        <ResourceItem
          description="A list of ColorStack chapters across the nation."
          href="https://colorstack.notion.site/colorstack-chapters-list"
        >
          Chapters
        </ResourceItem>

        <ResourceItem
          description="The codebase where our software, called Oyster, lives. Go read + contribute to the codebase!"
          href="https://github.com/colorstackorg/oyster"
        >
          GitHub
        </ResourceItem>

        <ResourceItem
          description="A collection of our past event recordings. Don't miss a beat!"
          href="https://youtube.com/@colorstackinc.2266"
        >
          YouTube Channel
        </ResourceItem>

        <ResourceItem
          description="Show off your ColorStack pride with our new merch collection!"
          href="https://colorstackmerch.org"
        >
          Merch Store
        </ResourceItem>

        <ResourceItem
          description="Don't act a fool. Abide by our Code of Conduct!"
          href="https://wiki.colorstack.org/the-colorstack-family/community/code-of-conduct/code-of-conduct"
        >
          Code of Conduct
        </ResourceItem>
      </ul>
    </Card>
  );
}

function ResourceItem({
  children,
  description,
  href,
}: PropsWithChildren<
  Pick<HTMLAnchorElement, 'href'> & { description?: string }
>) {
  return (
    <li>
      <Link className="link" to={href} target="_blank">
        {children}
      </Link>

      {description && <Text color="gray-500">{description}</Text>}
    </li>
  );
}

function SocialsCard() {
  return (
    <Card>
      <Card.Title>ColorStack Socials</Card.Title>

      <Card.Description>
        Be sure to follow us on all our socials to stay up to date with what's
        happening in ColorStack.
      </Card.Description>

      <ul className="flex gap-4">
        <SocialItem
          Icon={Linkedin}
          href="https://linkedin.com/company/colorstack"
        />

        <SocialItem
          Icon={Instagram}
          href="https://instagram.com/colorstackorg"
        />

        <SocialItem Icon={Twitter} href="https://twitter.com/colorstackorg" />

        <SocialItem Icon={GitHub} href="https://github.com/colorstackorg" />

        <SocialItem
          Icon={Youtube}
          href="https://youtube.com/@colorstackinc.2266"
        />
      </ul>
    </Card>
  );
}

function SocialItem({
  href,
  Icon,
}: PropsWithChildren<Pick<HTMLAnchorElement, 'href'> & { Icon: Icon }>) {
  return (
    <li>
      <a href={href} target="_blank">
        <Icon className="text-primary" size={28} />
      </a>
    </li>
  );
}

function MerchStoreCard() {
  return (
    <Card>
      <Card.Title>Merch Store</Card.Title>

      <Card.Description>
        Show off your pride as a member of the ColorStack community with our new
        merch collection!
      </Card.Description>

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] items-center gap-4">
        <MerchStoreItem
          alt="ColorStack Shirt #1"
          src="/images/colorstack-shirt-black-1.png"
        />

        <MerchStoreItem
          alt="ColorStack Notebook"
          src="/images/colorstack-notebook-navy.png"
        />

        <MerchStoreItem
          alt="ColorStack Shirt #2"
          src="/images/colorstack-shirt-black-2.png"
        />
      </ul>

      <Button.Group>
        <Button.Slot variant="primary">
          <a href="https://colorstackmerch.org" target="_blank">
            Shop Now <ExternalLink size={20} />
          </a>
        </Button.Slot>
      </Button.Group>
    </Card>
  );
}

function MerchStoreItem(props: Pick<HTMLImageElement, 'alt' | 'src'>) {
  return (
    <li className="rounded-lg border border-gray-100">
      <img
        className="mx-auto aspect-square min-w-[120px] rounded-[inherit]"
        {...props}
      />
    </li>
  );
}

// Home Compound Component

const Home = () => {};

Home.Column = function Column({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cx('flex flex-col gap-[inherit]', className)}>
      {children}
    </div>
  );
};
