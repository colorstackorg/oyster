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
  useSearchParams,
} from '@remix-run/react';
import { FileText, Plus, Star, Users } from 'react-feather';

import { ListCompaniesWhere } from '@oyster/core/employment';
import { listCompanies } from '@oyster/core/employment.server';
import { track } from '@oyster/infrastructure/mixpanel';
import {
  cx,
  Dashboard,
  ExistingSearchParams,
  getButtonCn,
  getTextCn,
  Pagination,
  Text,
} from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';
import { PaginationSearchParams } from '@/shared/types';

const CompaniesSearchParams = PaginationSearchParams.merge(ListCompaniesWhere);

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = CompaniesSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const { companies, totalCount } = await listCompanies({
    pagination: {
      limit: searchParams.limit,
      page: searchParams.page,
    },
    select: [
      'companies.description',
      'companies.id',
      'companies.imageUrl',
      'companies.name',
    ],
    where: { search: searchParams.search },
  });

  track({
    event: 'Page Viewed',
    properties: { Page: 'Companies' },
    request,
    user: user(session),
  });

  return json({
    companies,
    limit: searchParams.limit,
    page: searchParams.page,
    totalCount,
  });
}

export default function CompaniesPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <Text variant="2xl">Companies 💼</Text>
        <AddReviewLink />
      </header>

      <section className="flex flex-wrap gap-4">
        <Dashboard.SearchForm placeholder="Search by title...">
          <ExistingSearchParams exclude={['page']} />
        </Dashboard.SearchForm>
      </section>

      <CompaniesList />
      <CompaniesPagination />
      <Outlet />
    </>
  );
}

function AddReviewLink() {
  const [searchParams] = useSearchParams();

  return (
    <Link
      className={getButtonCn({})}
      to={{
        pathname: Route['/companies/reviews/add'],
        search: searchParams.toString(),
      }}
    >
      <Plus size={16} /> Add Review
    </Link>
  );
}

function CompaniesPagination() {
  const { companies, limit, page, totalCount } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={companies.length}
      page={page}
      pageSize={limit}
      totalCount={totalCount}
    />
  );
}

// List

function CompaniesList() {
  const { companies } = useLoaderData<typeof loader>();

  if (!companies.length) {
    return (
      <div className="mt-4">
        <Text color="gray-500">There were no companies found.</Text>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 @[800px]:grid-cols-2 @[1200px]:grid-cols-3 @[1600px]:grid-cols-4">
      {companies.map((company) => {
        return <CompanyItem key={company.id} company={company} />;
      })}
    </ul>
  );
}

type CompanyInView = SerializeFrom<typeof loader>['companies'][number];

function CompanyItem({ company }: { company: CompanyInView }) {
  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-gray-200 p-4">
      <header className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg border border-gray-200 p-1">
          <img
            className="aspect-square h-full w-full rounded-md"
            src={company.imageUrl as string}
          />
        </div>

        <Link
          className={cx(
            getTextCn({ variant: 'lg' }),
            'hover:text-primary hover:underline'
          )}
          to={generatePath(Route['/companies/:id/overview'], {
            id: company.id,
          })}
        >
          {company.name}
        </Link>
      </header>

      <Text className="line-clamp-2" color="gray-500" variant="sm">
        {company.description}
      </Text>

      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              className={cx(
                getTextCn({ color: 'gray-500', variant: 'sm' }),
                'flex items-center gap-1',
                'hover:text-primary hover:underline'
              )}
              to={generatePath(Route['/companies/:id/employees'], {
                id: company.id,
              })}
            >
              <Users size="16" />
              <span>{company.currentEmployees}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <TooltipText>
              {company.currentEmployees} members work here
            </TooltipText>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              className={cx(
                getTextCn({ color: 'gray-500', variant: 'sm' }),
                'flex items-center gap-1',
                'hover:text-primary hover:underline'
              )}
              to={generatePath(Route['/companies/:id/reviews'], {
                id: company.id,
              })}
            >
              <FileText size="16" />
              <span>{company.reviews}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <TooltipText>{company.reviews} review(s)</TooltipText>
          </TooltipContent>
        </Tooltip>

        {!!company.averageRating && (
          <Text
            className="ml-auto flex items-center gap-1"
            color="gray-500"
            variant="sm"
          >
            <span>{company.averageRating}</span>{' '}
            <Star className="fill-gray-50" size="16" />
          </Text>
        )}
      </div>
    </li>
  );
}
