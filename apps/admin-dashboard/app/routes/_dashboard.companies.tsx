import { sql } from 'kysely';
import { Edit, Menu, Plus, Trash } from 'react-feather';
import {
  useSearchParams as _useSearchParams,
  generatePath,
  Link,
  type LoaderFunctionArgs,
  Outlet,
  useLoaderData,
} from 'react-router';

import { ListSearchParams } from '@oyster/core/admin-dashboard/ui';
import { db } from '@oyster/db';
import {
  Dashboard,
  Dropdown,
  IconButton,
  Pagination,
  type SerializeFrom,
  Table,
  type TableColumnProps,
  useSearchParams,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = ListSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const { companies, totalCompanies } = await listCompanies(searchParams);

  return {
    companies,
    totalCompanies,
  };
}

async function listCompanies({ limit, page, search }: ListSearchParams) {
  const query = db.selectFrom('companies').$if(!!search, (qb) => {
    return qb
      .where(sql<boolean>`similarity(name, ${search}) > 0.15`)
      .where(sql<boolean>`word_similarity(name, ${search}) > 0.15`);
  });

  const [rows, countResult] = await Promise.all([
    query
      .select([
        'companies.domain',
        'companies.id',
        'companies.imageUrl',
        'companies.name',
      ])
      .select((eb) => {
        return eb
          .selectFrom('resumeBookSponsors')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('resumeBookSponsors.companyId', '=', 'companies.id')
          .as('sponsorships');
      })
      .$if(!search, (qb) => {
        return qb.orderBy('companies.name', 'asc');
      })
      .$if(!!search, (qb) => {
        return qb.orderBy(sql`similarity(name, ${search})`, 'desc');
      })
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    companies: rows,
    totalCompanies: parseInt(countResult.count),
  };
}

export default function CompaniesPage() {
  return (
    <>
      <Dashboard.Title>Companies</Dashboard.Title>

      <Dashboard.Subheader>
        <Dashboard.SearchForm placeholder="Search companies..." />
        <CompaniesActionDropdown />
      </Dashboard.Subheader>

      <CompaniesTable />
      <CompaniesPagination />
      <Outlet />
    </>
  );
}

function CompaniesActionDropdown() {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger>
        <IconButton
          backgroundColor="gray-100"
          backgroundColorOnHover="gray-200"
          icon={<Menu />}
          shape="square"
        />
      </Dropdown.Trigger>

      <Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link to={Route['/companies/create']}>
              <Plus /> Create Company
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Dropdown>
    </Dropdown.Root>
  );
}

type CompanyInView = SerializeFrom<typeof loader>['companies'][number];

function CompaniesTable() {
  const { companies } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<CompanyInView>[] = [
    {
      displayName: 'Logo',
      size: '80',
      render: (company) => {
        if (!company.imageUrl) {
          return (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
              N/A
            </div>
          );
        }

        return (
          <img
            alt={company.name}
            className="h-10 w-10 rounded-lg border border-gray-200 p-1"
            src={company.imageUrl}
          />
        );
      },
    },
    {
      displayName: 'Name',
      size: '320',
      render: (company) => company.name,
    },
    {
      displayName: 'Domain',
      size: '240',
      render: (company) => company.domain,
    },
    {
      displayName: 'Resume Books',
      size: '160',
      render: (company) => Number(company.sponsorships),
    },
    {
      size: '48',
      sticky: true,
      render: (company) => <CompaniesTableDropdown {...company} />,
    },
  ];

  return (
    <Table
      columns={columns}
      data={companies}
      emptyMessage="No companies found."
    />
  );
}

function CompaniesPagination() {
  const [searchParams] = useSearchParams(ListSearchParams);

  const { companies, totalCompanies } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={companies.length}
      page={searchParams.page}
      pageSize={searchParams.limit}
      totalCount={totalCompanies}
    />
  );
}

function CompaniesTableDropdown({ id }: CompanyInView) {
  const [searchParams] = _useSearchParams();

  return (
    <Dropdown.Root>
      <Table.Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link
              preventScrollReset
              to={{
                pathname: generatePath(Route['/companies/:id/edit'], { id }),
                search: searchParams.toString(),
              }}
            >
              <Edit /> Edit Company
            </Link>
          </Dropdown.Item>

          <Dropdown.Item>
            <Link
              preventScrollReset
              to={{
                pathname: generatePath(Route['/companies/:id/delete'], { id }),
                search: searchParams.toString(),
              }}
            >
              <Trash /> Delete Company
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Table.Dropdown>

      <Table.DropdownOpenButton />
    </Dropdown.Root>
  );
}
