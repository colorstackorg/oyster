import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData, useSearchParams } from '@remix-run/react';
import { Plus } from 'react-feather';

import { listCompanies } from '@oyster/core/employment.server';
import { track } from '@oyster/infrastructure/mixpanel';
import {
  Dashboard,
  ExistingSearchParams,
  getButtonCn,
  Pagination,
  Text,
} from '@oyster/ui';

import { ListSearchParams } from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const CompaniesSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
  search: true,
});

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
    select: ['companies.id'],
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
  return null;
}
