import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from '@remix-run/react';
import { FileText, Plus, Star, Users } from 'react-feather';

import {
  ListCompaniesOrderBy,
  ListCompaniesWhere,
} from '@oyster/core/employment';
import { listCompanies } from '@oyster/core/employment.server';
import { track } from '@oyster/infrastructure/mixpanel';
import {
  cx,
  Dashboard,
  ExistingSearchParams,
  getButtonCn,
  getTextCn,
  Pagination,
  Select,
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

const CompaniesSearchParams = PaginationSearchParams.merge(
  ListCompaniesWhere
).extend({ orderBy: ListCompaniesOrderBy });

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = CompaniesSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const { companies, totalCount } = await listCompanies({
    orderBy: searchParams.orderBy,
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
    orderBy: searchParams.orderBy,
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
        <Dashboard.SearchForm>
          <ExistingSearchParams exclude={['page']} />
        </Dashboard.SearchForm>
        <SortCompaniesForm />
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

function SortCompaniesForm() {
  const { orderBy } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const sortKeys = ListCompaniesOrderBy._def.innerType.enum;

  return (
    <RemixForm
      className="flex min-w-[12rem] items-center gap-4"
      method="get"
      onChange={(e) => submit(e.currentTarget)}
    >
      <Select
        defaultValue={orderBy}
        name="orderBy"
        id="orderBy"
        placeholder="Sort By..."
        required
        width="fit"
      >
        <option value={sortKeys.most_employees}>
          Most ColorStack Employees
        </option>
        <option value={sortKeys.highest_rated}>Highest Rated</option>
        <option value={sortKeys.most_reviews}>Most Reviews</option>
        <option value={sortKeys.most_recently_reviewed}>
          Most Recently Reviewed
        </option>
      </Select>

      <ExistingSearchParams exclude={['orderBy']} />
    </RemixForm>
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
        <CompanyLogo imageUrl={company.imageUrl} />
        <CompanyTitle id={company.id} name={company.name} />
      </header>

      <CompanyDescription description={company.description} />

      <div className="flex items-center gap-4">
        <EmployeeCount employees={company.employees} />
        <ReviewCount reviews={company.reviews} />
        <AverageRating averageRating={company.averageRating} />
      </div>
    </li>
  );
}

function CompanyLogo({ imageUrl }: Pick<CompanyInView, 'imageUrl'>) {
  return (
    <div className="h-10 w-10 rounded-lg border border-gray-200 p-1">
      <img
        className="aspect-square h-full w-full rounded-md"
        src={imageUrl as string}
      />
    </div>
  );
}

function CompanyTitle({ id, name }: Pick<CompanyInView, 'id' | 'name'>) {
  return (
    <Link
      className={cx(
        getTextCn({ variant: 'lg' }),
        'hover:text-primary hover:underline'
      )}
      to={generatePath(Route['/companies/:id'], { id })}
    >
      {name}
    </Link>
  );
}

function CompanyDescription({
  description,
}: Pick<CompanyInView, 'description'>) {
  return (
    <Text className="line-clamp-2" color="gray-500" variant="sm">
      {description}
    </Text>
  );
}

function EmployeeCount({ employees }: Pick<CompanyInView, 'employees'>) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Text className="flex items-center gap-1" color="gray-500" variant="sm">
          <Users size="16" />
          <span>{employees}</span>
        </Text>
      </TooltipTrigger>
      <TooltipContent>
        <TooltipText>
          {employees === '1'
            ? `${employees} member has worked here`
            : `${employees} members have worked here`}
        </TooltipText>
      </TooltipContent>
    </Tooltip>
  );
}

function ReviewCount({ reviews }: Pick<CompanyInView, 'reviews'>) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Text className="flex items-center gap-1" color="gray-500" variant="sm">
          <FileText size="16" />
          <span>{reviews}</span>
        </Text>
      </TooltipTrigger>
      <TooltipContent>
        <TooltipText>
          {reviews === '1' ? `${reviews} review` : `${reviews} reviews`}
        </TooltipText>
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
    <Text
      className="ml-auto flex items-center gap-1"
      color="gray-500"
      variant="sm"
    >
      <span>{averageRating}</span> <Star className="fill-gray-50" size="16" />
    </Text>
  );
}
