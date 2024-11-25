import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import {
  type EmploymentType,
  type LocationType,
} from '@oyster/core/employment';
import {
  hasReviewAccess,
  listCompanyReviews,
} from '@oyster/core/employment/server';
import { Text } from '@oyster/ui';

import { CompanyReview } from '@/shared/components/company-review';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;
  const memberId = user(session);

  const [hasAccess, _reviews] = await Promise.all([
    hasReviewAccess(memberId),

    listCompanyReviews({
      memberId,
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
        'workExperiences.id as workExperienceId',
      ],
      where: { companyId: id },
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
        editable: review.reviewerId === user(session),
        reviewedAt: dayjs().to(createdAt),
      };
    }
  );

  return json({
    hasAccess,
    reviews,
  });
}

export default function ReviewsList() {
  const { hasAccess, reviews } = useLoaderData<typeof loader>();

  if (!reviews.length) {
    return <Text color="gray-500">Nobody has reviewed this company yet.</Text>;
  }

  return (
    <CompanyReview.List>
      {reviews.map((review, i) => {
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
            editable={review.editable}
            employmentType={review.employmentType as EmploymentType}
            hasAccess={hasAccess}
            hasUpvoted={review.upvoted as boolean}
            id={review.id}
            locationCity={review.locationCity}
            locationState={review.locationState}
            locationType={review.locationType as LocationType}
            rating={review.rating}
            recommend={review.recommend}
            reviewedAt={review.reviewedAt}
            reviewerFirstName={review.reviewerFirstName || ''}
            reviewerId={review.reviewerId || ''}
            reviewerLastName={review.reviewerLastName || ''}
            reviewerProfilePicture={review.reviewerProfilePicture}
            showAccessWarning={!hasAccess && i === 0}
            text={review.text}
            title={review.title || ''}
            upvotesCount={review.upvotes}
            workExperienceId={review.workExperienceId || ''}
          />
        );
      })}
    </CompanyReview.List>
  );
}
