import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import { listCompanyReviews } from '@oyster/core/employment/server';
import {
  type EmploymentType,
  type LocationType,
} from '@oyster/core/member-profile/ui';

import { getDateRange, Recap } from '@/routes/_profile.recap.$date';
import { CompanyReview } from '@/shared/components/company-review';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { endOfWeek, startOfWeek } = getDateRange(params.date);

  const _reviews = await listCompanyReviews({
    includeCompanies: true,
    memberId: user(session),
    select: [
      'companyReviews.anonymous',
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
  });

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

  return {
    reviews,
  };
}

export default function RecapReviews() {
  const { reviews } = useLoaderData<typeof loader>();

  return (
    <Recap>
      <Recap.Header>
        <Recap.Title>Company Reviews 💼 ({reviews.length})</Recap.Title>
        <Recap.Description>
          See what your peers have to say about their recent work experiences!
        </Recap.Description>
      </Recap.Header>

      <CompanyReview.List>
        {reviews.map((review) => {
          return (
            <CompanyReview
              key={review.id}
              anonymous={review.anonymous}
              company={{
                id: review.companyId || '',
                image: review.companyImage || '',
                name: review.companyName || '',
              }}
              date={review.date}
              employmentType={review.employmentType as EmploymentType}
              hasAccess={true} // We'll allow access to all reviews in recaps.
              hasUpvoted={review.upvoted as boolean}
              id={review.id}
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
              upvotesCount={review.upvotes}
            />
          );
        })}
      </CompanyReview.List>
    </Recap>
  );
}
