import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  useLoaderData,
  useParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ExternalLink } from 'react-feather';

import {
  getCompany,
  hasReviewAccess,
  listCompanyEmployees,
  listCompanyReviews,
} from '@oyster/core/employment/server';
import { cx, getTextCn, ProfilePicture, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import { NavigationItem } from '@/shared/components/navigation';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;
  const memberId = user(session);

  const [company, hasAccess, _employees, _reviews] = await Promise.all([
    getCompany({
      include: ['averageRating', 'employees', 'opportunities', 'reviews'],
      select: [
        'companies.description',
        'companies.domain',
        'companies.id',
        'companies.imageUrl',
        'companies.name',
        'companies.leetcodeSlug',
        'companies.levelsFyiSlug',
      ],
      where: { id },
    }),

    hasReviewAccess(memberId),

    listCompanyEmployees({
      where: { companyId: id },
    }),

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
    hasAccess,
    pastEmployees,
    reviews,
  });
}

export default function CompanyPage() {
  const { company, currentEmployees, pastEmployees, reviews } =
    useLoaderData<typeof loader>();
  const { id } = useParams();

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

            <LogoLinkGroup />
          </div>

          <DomainLink domain={company.domain} />
        </div>

        <AverageRating averageRating={company.averageRating} />
      </header>

      <Text color="gray-500">{company.description}</Text>
      <nav>
        <ul className="flex gap-4">
          <NavigationItem
            to={generatePath('/companies/:id/reviews' as string, { id })}
          >
            Reviews ({reviews.length})
          </NavigationItem>

          <NavigationItem
            to={generatePath('/companies/:id/current-employees' as string, {
              id,
            })}
          >
            Current Employees ({currentEmployees.length})
          </NavigationItem>

          <NavigationItem
            to={generatePath('/companies/:id/past-employees' as string, {
              id,
            })}
          >
            Past Employees ({pastEmployees.length})
          </NavigationItem>
        </ul>
      </nav>
      <Outlet />
    </section>
  );
}

function LogoLinkGroup() {
  const { company } = useLoaderData<typeof loader>();

  if (!company.leetcodeSlug && !company.levelsFyiSlug) {
    return null;
  }

  return (
    <ul className="mt-1 flex items-center gap-1">
      {company.levelsFyiSlug && (
        <LogoLink
          href={`https://www.levels.fyi/companies/${company.levelsFyiSlug}/salaries`}
          imageAlt="Levels.fyi Logo"
          imageSrc="/images/levels-fyi.png"
          tooltip="View Salary Information on Levels.fyi"
        />
      )}

      {company.leetcodeSlug && (
        <LogoLink
          href={`https://leetcode.com/company/${company.leetcodeSlug}`}
          imageAlt="Leetcode Logo"
          imageSrc="/images/leetcode.png"
          tooltip="View Leetcode Tagged Problems"
        />
      )}
    </ul>
  );
}

type LogoLinkProps = {
  href: string;
  imageAlt: string;
  imageSrc: string;
  tooltip: string;
};

function LogoLink({ href, imageAlt, imageSrc, tooltip }: LogoLinkProps) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            className="cursor-pointer hover:opacity-90"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <img alt={imageAlt} className="h-4 w-4 rounded-sm" src={imageSrc} />
          </a>
        </TooltipTrigger>

        <TooltipContent side="bottom">
          <TooltipText>{tooltip}</TooltipText>
        </TooltipContent>
      </Tooltip>
    </li>
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
    <div className="ml-auto">
      <Text>
        <span className="text-2xl">{averageRating}</span>/10
      </Text>
    </div>
  );
}

export type EmployeeInView = SerializeFrom<
  typeof loader
>['currentEmployees'][number];

export function EmployeeItem({ employee }: { employee: EmployeeInView }) {
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
