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
import { SlackMessage } from '@/shared/components/slack-message';
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

  const fakeAnnouncementMessages: {
    id: string;
    text: string | null;
    // totalReactions?: string | null | undefined;
  }[] = [
    {
      id: '1',
      text: `<!channel> Hey fam.

As promised, I wanted to address yesterday’s events regarding ColorStack and the termination of a now former employee.

Yesterday, we had to make the difficult decision to part ways with one of our team members. I believe in handling these matters confidentially, but unfortunately, they chose to share details of a private conversation, including an audio recording, on LinkedIn.

I want to reassure you that while this situation is unfortunate, it does not reflect any change in our team’s focus. Every decision that I’ve made up until this point has been with you all in mind, to build the team that will help us fulfill our mission effectively. We remain fully dedicated to this.

We are addressing this matter internally, but rest assured there will be no disruptions to any of our programs and upcoming events. We have a coverage plan in place to continue to attract and retain corporate partners that want to hire you all until we backfill the role.

Building a company is hard. There is always a lesson to be learned or an area for growth. This will only make us better as an organization moving forward.

Thank you for your understanding and continued trust in ColorStack.

-Jehron`,
    },
    {
      id: '2',
      text: ` <!channel> Hey Y'all! Happy Friday!! Keeping this one short and sweet!

 *Father's Day Celebration!* :green_heart: :fist::skin-tone-4:
 :sparkles: With Dad's Day this Sunday, we wondered if we have any Dads in our ColorStack Family?!
 We want to celebrate you!
 :arrow_right: *<https://docs.google.com/forms/d/e/1FAIpQLSc4kcMfg2YWhkC701iJQpEWBzeVHiTkfGNqJTEkhufhEnKncw/viewform|Fill out this short form >*to share how ColorStack has impacted your journey as a student/young professional and a father!

 *Member Profile New Releases!* :colorstack_logo:
 :sparkles: If you are wondering if other ColorStack'ers work at or have had a good experience with a company you're interested in, check out our:
 :arrow_right: <https://app.colorstack.io/companies|Companies Feature>

 :sparkles: Don't forget about our <https://app.colorstack.io/resources|Resource Database>! There is so much useful information, tools, and resources to guide and support you on your journeys in ColorStack, at your workplaces, during your job search, or in your classroom endeavors!
 :arrow_right: <https://app.colorstack.io/resources|Resource Database>

 *QOTD: Where do you dream of living after graduating college?*- <@U0730BL4HQE>
 Itching to ask the ColorStack Community something? <https://forms.gle/mVFZoWo2XW8z39HYA|Submit a QOTD here>`,
    },
  ];

  return json({
    announcementMessages: fakeAnnouncementMessages,
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
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-4 @container">
      <header>
        <Text variant="2xl">Last Week in ColorStack</Text>
        <Text color="gray-500">{dateRange}</Text>
      </header>

      <PointsLeaderboard />
      <AnnouncementMessages />
      <TopMessages />
      <Resources />
      <CompanyReviews />
    </section>
  );
}

function AnnouncementMessages() {
  const { announcementMessages } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Announcements ({announcementMessages.length})</Card.Title>

      <Card.Description>
        Announcements from the ColorStack team this week in #announcements.
      </Card.Description>

      <ul className="flex flex-col gap-4">
        {announcementMessages.map((message) => {
          return <SlackMessage key={message.id}>{message.text}</SlackMessage>;
        })}
      </ul>
    </Card>
  );
}

function PointsLeaderboard() {
  const { leaderboard } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Points Leaderboard 🏆</Card.Title>

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
