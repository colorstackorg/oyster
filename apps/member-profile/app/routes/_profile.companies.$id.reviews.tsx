import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import { Text } from '@oyster/ui';

import type { EmploymentType, LocationType } from '@/member-profile.ui';
import {
  getCompany,
  hasReviewAccess,
  listCompanyReviews,
} from '@/modules/employment/index.server';
import { Card } from '@/shared/components/card';
import { CompanyReview } from '@/shared/components/company-review';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;
  const memberId = user(session);

  const [company, hasAccess, _reviews] = await Promise.all([
    getCompany({
      include: ['averageRating', 'employees', 'reviews'],
      select: [
        'companies.description',
        'companies.domain',
        'companies.id',
        'companies.imageUrl',
        'companies.name',
        'companies.levelsFyiSlug',
      ],
      where: { id },
    }),
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

  if (!company) {
    throw new Response(null, { status: 404 });
  }

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
    company,
    hasAccess,
    reviews,
  });
}

export default function ReviewsList() {
  const { hasAccess, reviews } = useLoaderData<typeof loader>();

  return (
    <>
      <Card>
        <Card.Title>Reviews ({reviews.length})</Card.Title>

        {reviews.length ? (
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
        ) : (
          <Text color="gray-500">There are no reviews from ColorStack.</Text>
        )}
      </Card>
    </>
  );
}
