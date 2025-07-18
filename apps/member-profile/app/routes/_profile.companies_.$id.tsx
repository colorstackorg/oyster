import { useState } from 'react';
import { ExternalLink } from 'react-feather';
import {
  generatePath,
  Link,
  type LoaderFunctionArgs,
  Outlet,
  useLoaderData,
} from 'react-router';

import { getCompany } from '@oyster/core/employment/server';
import { Button, type SerializeFrom, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import { NavigationItem } from '@/shared/components/navigation';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const companyId = params.id as string;

  const company = await getCompany({
    include: ['averageRating', 'employees', 'opportunities', 'reviews'],
    select: [
      'companies.description',
      'companies.domain',
      'companies.id',
      'companies.imageUrl',
      'companies.linkedinId',
      'companies.name',
      'companies.leetcodeSlug',
      'companies.levelsFyiSlug',
    ],
    where: { id: companyId },
  });

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  return {
    company,
  };
}

export default function CompanyPage() {
  const { company } = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-[inherit]">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg border border-gray-200 p-1">
          <img
            className="aspect-square h-full w-full rounded-md object-contain"
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

      <CompanyDescription description={company.description} />
      <OpportunitiesAlert />
      <CompanyNavigation />
      <Outlet />
    </section>
  );
}

function LogoLinkGroup() {
  const { company } = useLoaderData<typeof loader>();

  if (!company.leetcodeSlug && !company.levelsFyiSlug && !company.linkedinId) {
    return null;
  }

  return (
    <ul className="mt-1 flex items-center gap-1">
      {company.linkedinId && (
        <LogoLink
          href={`https://www.linkedin.com/company/${company.linkedinId}`}
          imageAlt="LinkedIn Logo"
          imageSrc="/images/linkedin.png"
          tooltip="View Company on LinkedIn"
        />
      )}

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
            className="hover:opacity-90"
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

function CompanyDescription({
  description,
}: Pick<CompanyInView, 'description'>) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) {
    return null;
  }

  const isLongDescription = description.length > 400;
  const displayText = isExpanded ? description : description.slice(0, 400);

  return (
    <Text className="whitespace-pre-wrap" color="gray-500" variant="sm">
      {displayText}
      {isLongDescription && !isExpanded && (
        <>
          ...{' '}
          <button
            className="text-primary underline"
            onClick={() => setIsExpanded(true)}
            type="button"
          >
            see more
          </button>
        </>
      )}
    </Text>
  );
}

function OpportunitiesAlert() {
  const { company } = useLoaderData<typeof loader>();

  const opportunities = Number(company.opportunities);

  if (!opportunities) {
    return null;
  }

  // TODO: Need to extract this into a shared component.

  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-lg border border-primary border-opacity-30 bg-primary bg-opacity-5 p-2">
      <Text className="line-clamp-1" variant="sm">
        {opportunities === 1
          ? `${opportunities} open opportunity found.`
          : `${opportunities} open opportunities found.`}
      </Text>

      <Button.Slot>
        <Link
          to={{
            pathname: Route['/opportunities'],
            search: `?company=${company.id}`,
          }}
        >
          View
        </Link>
      </Button.Slot>
    </div>
  );
}

function CompanyNavigation() {
  const { company } = useLoaderData<typeof loader>();
  const { id } = company;

  return (
    <nav>
      <ul className="flex gap-4">
        <NavigationItem
          to={generatePath(Route['/companies/:id/reviews'], { id })}
        >
          Reviews ({company.reviews})
        </NavigationItem>

        <NavigationItem
          to={generatePath(Route['/companies/:id/employees'], { id })}
        >
          Employees ({company.employees})
        </NavigationItem>
      </ul>
    </nav>
  );
}
