import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { generatePath, Link, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  X,
} from 'react-feather';

import {
  type EmploymentType,
  FORMATTED_EMPLOYMENT_TYPE,
  FORMATTED_LOCATION_TYPE,
  LocationType,
} from '@oyster/core/employment';
import {
  getCompany,
  listCompanyEmployees,
  listCompanyReviews,
} from '@oyster/core/employment.server';
import { cx, Divider, getTextCn, Pill, ProfilePicture, Text } from '@oyster/ui';

import { Card } from '@/shared/components/card';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const id = params.id as string;

  const [company, employees, _reviews] = await Promise.all([
    getCompany({
      include: ['averageRating', 'employees', 'reviews'],
      select: [
        'companies.description',
        'companies.domain',
        'companies.id',
        'companies.imageUrl',
        'companies.name',
      ],
      where: { id },
    }),

    listCompanyEmployees({
      where: { companyId: id },
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
      where: { companyId: id },
    }),
  ]);

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  const currentEmployees = employees.filter((employee) => {
    return employee.status === 'current';
  });

  const pastEmployees = employees.filter((employee) => {
    return employee.status === 'past';
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
    company,
    currentEmployees,
    pastEmployees,
    reviews,
  });
}

export default function CompanyPage() {
  const { company } = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-[inherit]">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg border border-gray-200 p-1">
          <img
            className="aspect-square h-full w-full rounded-md"
            src={company.imageUrl as string}
          />
        </div>

        <div>
          <Text variant="2xl" weight="500">
            {company.name}
          </Text>

          <DomainLink domain={company.domain} />
        </div>

        <AverageRating averageRating={company.averageRating} />
      </header>

      <Text color="gray-500">{company.description}</Text>
      <ReviewsList />
      <CurrentEmployees />
      <PastEmployees />
    </section>
  );
}

type CompanyInView = SerializeFrom<typeof loader>['company'];

function DomainLink({ domain }: Pick<CompanyInView, 'domain'>) {
  if (!domain) {
    return null;
  }

  return (
    <a
      className="flex items-center gap-1 text-sm text-gray-500 hover:underline"
      href={'https://' + domain}
      target="_blank"
    >
      {domain} <ExternalLink size="16" />
    </a>
  );
}

function AverageRating({
  averageRating,
}: Pick<CompanyInView, 'averageRating'>) {
  if (!averageRating) {
    return null;
  }

  return (
    <div className="ml-auto mt-auto">
      <Text>
        <span className="text-2xl">{averageRating}</span>/10
      </Text>
    </div>
  );
}

function ReviewsList() {
  const { reviews } = useLoaderData<typeof loader>();

  if (!reviews.length) {
    return null;
  }

  return (
    <>
      <section className="flex flex-col gap-[inherit]">
        <Text weight="500" variant="lg">
          Reviews ({reviews.length})
        </Text>

        <ul className="flex flex-col gap-4">
          {reviews.map((review) => {
            return <CompanyReviewItem key={review.id} review={review} />;
          })}
        </ul>
      </section>

      <Divider my="4" />
    </>
  );
}

function CurrentEmployees() {
  const { currentEmployees } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Current Employees ({currentEmployees.length})</Card.Title>

      {currentEmployees.length ? (
        <ul>
          {currentEmployees.map((employee) => {
            return <EmployeeItem key={employee.id} employee={employee} />;
          })}
        </ul>
      ) : (
        <Text color="gray-500">
          There are no current employees from ColorStack.
        </Text>
      )}
    </Card>
  );
}

function PastEmployees() {
  const { pastEmployees } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Past Employees ({pastEmployees.length})</Card.Title>

      {pastEmployees.length ? (
        <ul>
          {pastEmployees.map((employee) => {
            return <EmployeeItem key={employee.id} employee={employee} />;
          })}
        </ul>
      ) : (
        <Text color="gray-500">
          There are no past employees from ColorStack.
        </Text>
      )}
    </Card>
  );
}

type EmployeeInView = SerializeFrom<typeof loader>['currentEmployees'][number];

function EmployeeItem({ employee }: { employee: EmployeeInView }) {
  const { firstName, id, lastName, profilePicture } = employee;

  return (
    <li className="line-clamp-1 grid grid-cols-[3rem_1fr] items-start gap-2 rounded-2xl p-2 hover:bg-gray-100">
      <ProfilePicture
        initials={firstName![0] + lastName![0]}
        size="48"
        src={profilePicture || undefined}
      />

      <div>
        <Link
          className={cx(getTextCn({}), 'hover:underline')}
          to={generatePath(Route['/directory/:id'], { id })}
        >
          {firstName} {lastName}
        </Link>

        <Text color="gray-500" variant="sm">
          {employee.title} &bull;{' '}
          {employee.locationType === LocationType.REMOTE
            ? 'Remote'
            : `${employee.locationCity}, ${employee.locationState}`}
        </Text>
      </div>
    </li>
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
