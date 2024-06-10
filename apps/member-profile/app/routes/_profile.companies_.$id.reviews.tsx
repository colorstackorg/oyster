import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { generatePath, Link, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Star, X } from 'react-feather';

import { listCompanyReviews } from '@oyster/core/employment.server';
import { cx, getTextCn, Pill, ProfilePicture, Text } from '@oyster/ui';

import {
  type EmploymentType,
  FORMATTED_EMPLOYMENT_TYPE,
  FORMATTED_LOCATION_TYPE,
  LocationType,
} from '@/member-profile.ui';
import { Card } from '@/shared/components/card';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const _reviews = await listCompanyReviews({
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
    where: { companyId: params.id as string },
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

  return json({
    reviews,
  });
}

export default function CompanyReviewsPage() {
  const { reviews } = useLoaderData<typeof loader>();

  if (!reviews.length) {
    return <Text color="gray-500">No reviews found.</Text>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {reviews.map((review) => {
        return <CompanyReviewItem key={review.id} review={review} />;
      })}
    </ul>
  );
}

type CompanyReviewInView = SerializeFrom<typeof loader>['reviews'][number];

function CompanyReviewItem({ review }: { review: CompanyReviewInView }) {
  return (
    <Card>
      <header className="flex items-center gap-1">
        <div className="flex w-fit items-center gap-2">
          <ProfilePicture
            initials={
              review.reviewerFirstName![0] + review.reviewerLastName![0]
            }
            size="32"
            src={review.reviewerProfilePicture || undefined}
          />

          <Link
            className={cx(
              getTextCn({ color: 'gray-500', variant: 'sm' }),
              'hover:underline'
            )}
            to={generatePath(Route['/directory/:id'], {
              id: review.reviewerId,
            })}
          >
            {review.reviewerFirstName} {review.reviewerLastName}
          </Link>
        </div>

        <Text color="gray-500" variant="sm">
          &bull;
        </Text>

        <Text color="gray-500" variant="sm">
          {review.reviewedAt}
        </Text>
      </header>

      <div className="flex items-center gap-4">
        <CompanyRating rating={review.rating} />

        <Text className="flex items-center gap-0.5" variant="sm">
          {review.recommend ? (
            <Check className="text-success" />
          ) : (
            <X className="text-error" />
          )}{' '}
          Recommend
        </Text>
      </div>

      <div>
        <Text weight="500">{review.title}</Text>
        <Text color="gray-500" variant="sm">
          {review.date}
        </Text>

        {review.locationType !== LocationType.REMOTE &&
          review.locationCity &&
          review.locationState && (
            <Text color="gray-500" variant="sm">
              {review.locationCity}, {review.locationState}
            </Text>
          )}

        <ul className="mt-2 flex flex-wrap gap-1">
          <li>
            <Pill color="blue-100">
              {
                FORMATTED_EMPLOYMENT_TYPE[
                  review.employmentType as EmploymentType
                ]
              }
            </Pill>
          </li>

          <li>
            <Pill color="lime-100">
              {FORMATTED_LOCATION_TYPE[review.locationType as LocationType]}
            </Pill>
          </li>
        </ul>
      </div>

      <ReviewText text={review.text} />
    </Card>
  );
}

function CompanyRating({ rating }: Pick<CompanyReviewInView, 'rating'>) {
  return (
    <div className="flex">
      {Array.from({ length: 10 }).map((_, index) => {
        return (
          <Star
            className={cx(
              rating >= index + 1
                ? 'fill-yellow-500 text-yellow-500'
                : 'fill-gray-300 text-gray-300'
            )}
            key={index}
            size="20"
          />
        );
      })}
    </div>
  );
}

function ReviewText({ text }: Pick<CompanyReviewInView, 'text'>) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <Text className={cx('whitespace-pre-wrap', !open && 'line-clamp-6')}>
        {text}
      </Text>

      <button
        className="flex items-center gap-1 text-primary"
        onClick={() => {
          setOpen((value) => !value);
        }}
        type="button"
      >
        {open ? (
          <>
            Show Less <ChevronUp />
          </>
        ) : (
          <>
            Show More <ChevronDown />
          </>
        )}
      </button>
    </>
  );
}
