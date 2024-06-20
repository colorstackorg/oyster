import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import { listCompanyReviews } from '@oyster/core/employment.server';
import { listResources } from '@oyster/core/resources.server';
import { listSlackMessages } from '@oyster/core/slack.server';
import { getPresignedURL } from '@oyster/infrastructure/object-storage';
import { Divider, Text } from '@oyster/ui';

import { getPointsLeaderboard } from '@/member-profile.server';
import { type EmploymentType, type LocationType } from '@/member-profile.ui';
import { type ResourceType } from '@/modules/resource';
import { Card } from '@/shared/components/card';
import { CompanyReview } from '@/shared/components/company-review';
import { Leaderboard } from '@/shared/components/leaderboard';
import { Resource } from '@/shared/components/resource';
import { getTimezone } from '@/shared/cookies.server';
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

  const [
    announcementMessages,
    topMessages,
    leaderboard,
    _reviews,
    { resources: _resources },
  ] = await Promise.all([
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
      limit: 25,
      where: {
        memberId,
        occurredAfter: startOfWeek,
        occurredBefore: endOfWeek,
      },
    }),

    listCompanyReviews({
      select: [
        'companyReviews.createdAt',
        'companyReviews.id',
        'companyReviews.rating',
        'companyReviews.recommend',
        'companyReviews.text',
        'students.id as reviewerId',
        'students.firstName as reviewerFirstName',
        'students.lastName as reviewerLastName',
        'students.profilePicture as reviewerProfilePicture',
        'workExperiences.employmentType',
        'workExperiences.endDate',
        'workExperiences.locationCity',
        'workExperiences.locationState',
        'workExperiences.locationType',
        'workExperiences.startDate',
        'workExperiences.title',
      ],
      where: {
        postedAfter: startOfWeek,
        postedBefore: endOfWeek,
      },
    }),

    listResources({
      memberId: user(session),
      orderBy: 'most_upvotes',
      pagination: {
        limit: 1000,
        page: 1,
      },
      select: [
        'resources.description',
        'resources.id',
        'resources.link',
        'resources.postedAt',
        'resources.title',
        'resources.type',
        'students.firstName as posterFirstName',
        'students.id as posterId',
        'students.lastName as posterLastName',
        'students.profilePicture as posterProfilePicture',
      ],
      where: {
        postedAfter: startOfWeek,
        postedBefore: endOfWeek,
        search: '',
        tags: [],
      },
    }),
  ]);

  const reviews = _reviews.map(
    ({ createdAt, endDate, startDate, ...review }) => {
      const startMonth = dayjs.utc(startDate).format('MMMM YYYY');

      const endMonth = endDate
        ? dayjs.utc(endDate).format('MMMM YYYY')
        : 'Present';

      return {
        ...review,
        date: `${startMonth} - ${endMonth}`,
        reviewedAt: dayjs().to(createdAt),
      };
    }
  );

  const url = new URL(request.url);

  const resources = await Promise.all(
    _resources.map(
      async ({
        attachments,
        postedAt,
        tags,
        upvotes,
        upvoted,
        views,
        ...record
      }) => {
        return {
          ...record,

          // If there are any attachments, we need to generate a presigned URL
          // to the object in the Cloudflare R2 bucket.
          attachments: await Promise.all(
            (attachments || []).map(async (attachment) => {
              return {
                mimeType: attachment.mimeType,
                uri: await getPresignedURL({
                  expiresIn: 60 * 60, // 1 hour
                  key: attachment.s3Key,
                }),
              };
            })
          ),

          // If the logged-in member is the poster of the resource, they should
          // be able to edit the resource.
          editable: record.posterId === user(session),

          // This is a relative time of when the resource was posted,
          // ie: "2d" (2 days ago).
          postedAt: dayjs().to(postedAt),

          postedAtExpanded: dayjs(postedAt)
            .tz(getTimezone(request))
            .format('MMM DD, YYYY • h:mm A'),

          // This is the URL that can be shared with others to view the
          // resource. Note: This is a URL to our application, not the _actual_
          // resource URL (which has permissions via the presigned URL).
          shareableUri: `${url.protocol}//${url.host}/resources?id=${record.id}`,

          tags: tags!,
          upvotes: Number(upvotes),
          upvoted: Boolean(upvoted),
          views: Number(views),
        };
      }
    )
  );

  return json({
    announcementMessages,
    dateRange: getDateRange(params.date as string),
    leaderboard,
    resources,
    reviews,
    topMessages,
  });
}

function getDateRange(date: string) {
  const dayObject = dayjs(date);

  const format = 'dddd, MMMM D, YYYY';

  const dateRange =
    dayObject.startOf('week').format(format) +
    ' - ' +
    dayObject.endOf('week').format(format);

  return dateRange;
}

export default function WeekInReviewPage() {
  const { dateRange } = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-[inherit] @container">
      <header>
        <Text variant="2xl">Last Week in ColorStack</Text>
        <Text color="gray-500">{dateRange}</Text>
      </header>

      <AnnouncementMessages />
      <TopMessages />
      <PointsLeaderboard />
      <Resources />
      <CompanyReviews />
    </section>
  );
}

function AnnouncementMessages() {
  const { announcementMessages } = useLoaderData<typeof loader>();

  return null;
}

function PointsLeaderboard() {
  const { leaderboard } = useLoaderData<typeof loader>();

  return (
    <Card className="flex-1">
      <Card.Header>
        <Card.Title>Points Leaderboard 🏆</Card.Title>
      </Card.Header>

      <Card.Description>
        The top point earners in the ColorStack Family this week.
      </Card.Description>

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

function Resources() {
  const { resources } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Resources 📚 ({resources.length})</Card.Title>

      <Card.Description>
        Helpful resources that were shared this week.
      </Card.Description>

      <Resource.List>
        {resources.map((resource) => {
          return (
            <>
              <Divider />

              <Resource
                key={resource.id}
                attachments={resource.attachments}
                border={false}
                description={resource.description}
                editable={resource.editable}
                id={resource.id}
                link={resource.link}
                postedAt={resource.postedAt}
                postedAtExpanded={resource.postedAtExpanded}
                posterFirstName={resource.posterFirstName as string}
                posterId={resource.posterId as string}
                posterLastName={resource.posterLastName as string}
                posterProfilePicture={resource.posterProfilePicture}
                shareableUri={resource.shareableUri}
                tags={resource.tags}
                title={resource.title}
                type={resource.type as ResourceType}
                upvoted={resource.upvoted}
                upvotes={resource.upvotes}
                views={resource.views}
              />
            </>
          );
        })}
      </Resource.List>
    </Card>
  );
}

function CompanyReviews() {
  const { reviews } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Company Reviews ({reviews.length})</Card.Title>

      <Card.Description>
        See what your peers have to say about their recent work experiences!
      </Card.Description>

      <CompanyReview.List>
        {reviews.map((review) => {
          return (
            <>
              <Divider />

              <CompanyReview
                key={review.id}
                border={false}
                date={review.date}
                employmentType={review.employmentType as EmploymentType}
                locationCity={review.locationCity}
                locationState={review.locationState}
                locationType={review.locationType as LocationType}
                rating={review.rating}
                recommend={review.recommend}
                reviewedAt={review.reviewedAt}
                reviewerFirstName={review.reviewerFirstName as string}
                reviewerId={review.reviewerId as string}
                reviewerLastName={review.reviewerLastName as string}
                reviewerProfilePicture={review.reviewerProfilePicture}
                text={review.text}
                title={review.title as string}
              />
            </>
          );
        })}
      </CompanyReview.List>
    </Card>
  );
}

function TopMessages() {
  const { topMessages } = useLoaderData<typeof loader>();

  return null;
}
