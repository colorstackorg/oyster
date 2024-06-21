import { generatePath, Link } from '@remix-run/react';
import { type PropsWithChildren, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Star, X } from 'react-feather';

import {
  type EmploymentType,
  FORMATTED_EMPLOYMENT_TYPE,
  FORMATTED_LOCATION_TYPE,
  type LocationType,
} from '@oyster/core/employment';
import { cx, getTextCn, Pill, ProfilePicture, Text } from '@oyster/ui';

import { Card } from '@/shared/components/card';
import { Route } from '@/shared/constants';

type CompanyReviewProps = {
  date: string;
  employmentType: EmploymentType;
  locationCity: string | null;
  locationState: string | null;
  locationType: LocationType;
  rating: number;
  recommend: boolean;
  reviewerFirstName: string;
  reviewerLastName: string;
  reviewerId: string;
  reviewerProfilePicture: string | null;
  reviewedAt: string;
  text: string;
  title: string;
};

export const CompanyReview = ({
  date,
  employmentType,
  locationCity,
  locationState,
  locationType,
  rating,
  recommend,
  reviewerFirstName,
  reviewerId,
  reviewerLastName,
  reviewerProfilePicture,
  reviewedAt,
  text,
  title,
}: CompanyReviewProps) => {
  return (
    <Card>
      <header className="flex items-center gap-1">
        <CompanyReviewer
          reviewerFirstName={reviewerFirstName}
          reviewerLastName={reviewerLastName}
          reviewerId={reviewerId}
          reviewerProfilePicture={reviewerProfilePicture}
        />

        <Text color="gray-500" variant="sm">
          &bull;
        </Text>

        <Text color="gray-500" variant="sm">
          {reviewedAt}
        </Text>
      </header>

      <div className="flex items-center gap-4">
        <CompanyReviewRating rating={rating} />
        <CompanyReviewRecommend recommend={recommend} />
      </div>

      <div>
        <Text weight="500">{title}</Text>
        <Text color="gray-500" variant="sm">
          {date}
        </Text>

        {locationType !== 'remote' && locationCity && locationState && (
          <Text color="gray-500" variant="sm">
            {locationCity}, {locationState}
          </Text>
        )}

        <ul className="mt-2 flex flex-wrap gap-1">
          <li>
            <Pill color="blue-100">
              {FORMATTED_EMPLOYMENT_TYPE[employmentType]}
            </Pill>
          </li>

          <li>
            <Pill color="lime-100">
              {FORMATTED_LOCATION_TYPE[locationType]}
            </Pill>
          </li>
        </ul>
      </div>

      <CompanyReviewText text={text} />
    </Card>
  );
};

function CompanyReviewer({
  reviewerFirstName,
  reviewerId,
  reviewerLastName,
  reviewerProfilePicture,
}: Pick<
  CompanyReviewProps,
  | 'reviewerFirstName'
  | 'reviewerLastName'
  | 'reviewerId'
  | 'reviewerProfilePicture'
>) {
  return (
    <div className="flex w-fit items-center gap-2">
      <ProfilePicture
        initials={reviewerFirstName![0] + reviewerLastName![0]}
        size="32"
        src={reviewerProfilePicture || undefined}
      />

      <Link
        className={cx(
          getTextCn({ color: 'gray-500', variant: 'sm' }),
          'hover:underline'
        )}
        to={generatePath(Route['/directory/:id'], { id: reviewerId })}
      >
        {reviewerFirstName} {reviewerLastName}
      </Link>
    </div>
  );
}

function CompanyReviewRating({ rating }: Pick<CompanyReviewProps, 'rating'>) {
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

function CompanyReviewRecommend({
  recommend,
}: Pick<CompanyReviewProps, 'recommend'>) {
  const icon = recommend ? (
    <Check className="text-success" />
  ) : (
    <X className="text-error" />
  );

  return (
    <Text className="flex items-center gap-0.5" variant="sm">
      {icon} Recommend
    </Text>
  );
}

function CompanyReviewText({ text }: Pick<CompanyReviewProps, 'text'>) {
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

CompanyReview.List = function List({ children }: PropsWithChildren) {
  return <ul className="flex flex-col gap-4">{children}</ul>;
};
