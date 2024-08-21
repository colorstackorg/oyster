import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { generatePath, Link, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { ExternalLink } from 'react-feather';

import {
  type EmploymentType,
  type LocationType,
} from '@oyster/core/employment';
import {
  getCompany,
  listCompanyEmployees,
  listCompanyReviews,
} from '@oyster/core/employment.server';
import { cx, Divider, getTextCn, ProfilePicture, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import { Card } from '@/shared/components/card';
import { CompanyReview } from '@/shared/components/company-review';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;

  const [company, _employees, _reviews] = await Promise.all([
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

    listCompanyEmployees({
      where: { companyId: id },
    }),

    listCompanyReviews({
      memberId: user(session),
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
        'workExperiences.id as workExperienceId',
      ],
      where: { companyId: id },
    }),
  ]);

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  const employees = _employees.map(
    ({ locationCity, locationState, ...employee }) => {
      return {
        ...employee,
        ...(locationCity &&
          locationState && {
            location: `${locationCity}, ${locationState}`,
          }),
      };
    }
  );

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
        editable: review.reviewerId === user(session),
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
          <div className="flex items-center gap-2">
            <Text variant="2xl" weight="500">
              {company.name}
            </Text>

            {company.levelsFyiSlug && (
              <LevelsFyiLink slug={company.levelsFyiSlug} />
            )}
          </div>

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

type LevelsFyiLinkProps = {
  slug: string;
};

function LevelsFyiLink({ slug }: LevelsFyiLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          className="mt-1"
          href={`https://www.levels.fyi/companies/${slug}/salaries`}
          rel="noopener noreferrer"
          target="_blank"
        >
          <img
            alt="Levels.fyi Logo"
            className="h-4 w-4 cursor-pointer rounded-sm hover:opacity-90"
            src="/images/levels-fyi.png"
          />
        </a>
      </TooltipTrigger>
      <TooltipContent>
        <TooltipText>View Salary Information on Levels.fyi</TooltipText>
      </TooltipContent>
    </Tooltip>
  );
}

function AverageRating({
  averageRating,
}: Pick<CompanyInView, 'averageRating'>) {
  if (!averageRating) {
    return null;
  }

  return (
    <div className="ml-auto">
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

        <CompanyReview.List>
          {reviews.map((review) => {
            return (
              <CompanyReview
                key={review.id}
                company={{
                  id: review.companyId || '',
                  image: review.companyImage || '',
                  name: review.companyName || '',
                }}
                date={review.date}
                editable={review.editable}
                employmentType={review.employmentType as EmploymentType}
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
                text={review.text}
                title={review.title || ''}
                upvotesCount={review.upvotes}
                workExperienceId={review.workExperienceId || ''}
              />
            );
          })}
        </CompanyReview.List>
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
  const { firstName, id, lastName, location, profilePicture, title } = employee;

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
          {location ? (
            <>
              {title} &bull; {location}
            </>
          ) : (
            <>{title}</>
          )}
        </Text>
      </div>
    </li>
  );
}
