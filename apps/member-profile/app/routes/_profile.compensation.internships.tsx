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
import dayjs from 'dayjs';
import { Briefcase, Calendar, DollarSign, MapPin } from 'react-feather';

import { db } from '@oyster/db';
import { Pagination, Table, type TableColumnProps } from '@oyster/ui';
import {
  FilterButton,
  FilterEmptyMessage,
  FilterItem,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  type FilterValue,
  useFilterContext,
} from '@oyster/ui/filter';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);

  const { searchParams } = new URL(request.url);
  const { limit: _limit, page: _page } = Object.fromEntries(searchParams);

  const limit = parseInt(_limit) || 50;
  const page = parseInt(_page) || 1;

  const [
    appliedCompany,
    allCompanies,
    allLocations,
    { internshipOffers, totalInternshipOffers },
  ] = await Promise.all([
    getAppliedCompany(searchParams),
    listAllCompanies(),
    listAllLocations(),
    listInternshipOffers(searchParams, { limit, memberId, page }),
  ]);

  return json({
    allCompanies,
    allLocations,
    appliedCompany,
    limit,
    internshipOffers,
    page,
    totalInternshipOffers,
  });
}

export default function InternshipOffersPage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyFilter />
          <HourlyRateFilter />
          <LocationFilter />
          <DatePostedFilter />
        </div>
      </div>

      <InternshipOffersTable />
      <InternshipOffersPagination />
      <Outlet />
    </>
  );
}

type InternshipOfferInView = SerializeFrom<
  typeof loader
>['internshipOffers'][number];

function InternshipOffersTable() {
  const { internshipOffers } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const formatter = new Intl.NumberFormat('en-US');

  const columns: TableColumnProps<InternshipOfferInView>[] = [
    {
      displayName: 'Company',
      size: '200',
      render: (internshipOffer) => <CompanyColumn {...internshipOffer} />,
    },
    {
      displayName: 'Role',
      size: '320',
      render: (internshipOffer) => internshipOffer.role,
    },
    {
      displayName: 'Hourly Rate',
      size: '160',
      render: (internshipOffer) =>
        internshipOffer.hourlyRate
          ? `$${formatter.format(internshipOffer.hourlyRate)}/hr`
          : null,
    },
    {
      displayName: 'Monthly Rate',
      size: '160',
      render: (internshipOffer) =>
        internshipOffer.monthlyRate
          ? `$${formatter.format(internshipOffer.monthlyRate)}/mo`
          : null,
    },
    {
      displayName: 'Location',
      size: '200',
      render: (internshipOffer) => internshipOffer.location,
    },
  ];

  return (
    <Table
      columns={columns}
      data={internshipOffers}
      emptyMessage="No internship offers found matching your criteria."
      rowTo={(row) => {
        return {
          pathname: generatePath(Route['/compensation/internships/:id'], {
            id: row.id,
          }),
          search: searchParams.toString(),
        };
      }}
    />
  );
}

function HourlyRateFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const minRate = searchParams.get('minRate');
  const maxRate = searchParams.get('maxRate');

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setSearchParams((params) => {
      params.delete('page');

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      return params;
    });
  }

  return (
    <FilterRoot>
      <FilterButton
        icon={<DollarSign />}
        popover
        selectedValues={
          minRate || maxRate
            ? [
                {
                  color: 'green-100',
                  label: `${minRate ? formatter.format(parseInt(minRate)) : '$0'}/hr - ${
                    maxRate ? formatter.format(parseInt(maxRate)) : '∞'
                  }/hr`,
                  value: `${minRate || '0'}-${maxRate || '∞'}`,
                },
              ]
            : []
        }
      >
        Hourly Rate Range
      </FilterButton>

      <FilterPopover>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Min Rate
              </label>
              <input
                type="number"
                name="minRate"
                value={minRate || ''}
                onChange={handleChange}
                placeholder="0"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Max Rate
              </label>
              <input
                type="number"
                name="maxRate"
                value={maxRate || ''}
                onChange={handleChange}
                placeholder="No limit"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </FilterPopover>
    </FilterRoot>
  );
}

function InternshipOffersPagination() {
  const { limit, internshipOffers, page, totalInternshipOffers } =
    useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={internshipOffers.length}
      page={page}
      pageSize={limit}
      totalCount={totalInternshipOffers}
    />
  );
}

async function getAppliedCompany(searchParams: URLSearchParams) {
  const companyFromSearch = searchParams.get('company');

  if (!companyFromSearch) {
    return null;
  }

  const company = await db
    .selectFrom('companies')
    .select(['id', 'name', 'imageUrl'])
    .where((eb) => {
      return eb.or([
        eb('companies.id', '=', companyFromSearch),
        eb('companies.name', 'ilike', companyFromSearch),
      ]);
    })
    .executeTakeFirst();

  return company;
}

function CompanyColumn({
  companyId,
  companyLogo,
  companyName,
}: InternshipOfferInView) {
  if (!companyId || !companyName) {
    return null;
  }

  return (
    <Link
      className="flex w-fit max-w-full items-center gap-2 hover:underline"
      target="_blank"
      to={generatePath(Route['/companies/:id'], { id: companyId })}
    >
      <div className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-200 p-1">
        <img
          alt={companyName as string}
          className="aspect-square h-full w-full rounded-md"
          src={companyLogo as string}
        />
      </div>

      <span className="truncate text-sm">{companyName}</span>
    </Link>
  );
}

async function listAllCompanies() {
  const companies = await db
    .selectFrom('companies')
    .select(['id', 'name', 'imageUrl'])
    .where((eb) => {
      return eb.exists(() => {
        return eb
          .selectFrom('internshipJobOffers')
          .whereRef('internshipJobOffers.companyId', '=', 'companies.id');
      });
    })
    .orderBy('name', 'asc')
    .execute();

  return companies;
}

async function listAllLocations() {
  const locations = await db
    .selectFrom('internshipJobOffers')
    .select('location')
    .distinct()
    .where('location', 'is not', null)
    .orderBy('location', 'asc')
    .execute();

  return locations;
}

async function listInternshipOffers(
  searchParams: URLSearchParams,
  { limit, memberId, page }: { limit: number; memberId: string; page: number }
) {
  const { company, since, minRate, maxRate } = Object.fromEntries(searchParams);
  const locations = searchParams.getAll('location');

  const query = db
    .selectFrom('internshipJobOffers')
    .leftJoin('companies', 'companies.id', 'internshipJobOffers.companyId')
    .$if(!!company, (qb) => {
      return qb.where((eb) => {
        return eb.or([
          eb('companies.id', '=', company),
          eb('companies.name', 'ilike', company),
        ]);
      });
    })
    .$if(!!since, (qb) => {
      const daysAgo = parseInt(since);

      if (!daysAgo) return qb;
      const date = dayjs().subtract(daysAgo, 'day').toDate();

      return qb.where('internshipJobOffers.createdAt', '>=', date);
    })
    .$if(locations.length > 0, (qb) => {
      return qb.where((eb) => {
        return eb.or(
          locations.map((location) => {
            return eb('internshipJobOffers.location', '=', location);
          })
        );
      });
    })
    .$if(!!minRate, (qb) => {
      return qb.where(
        'internshipJobOffers.hourlyRate',
        '>=',
        parseInt(minRate)
      );
    })
    .$if(!!maxRate, (qb) => {
      return qb.where(
        'internshipJobOffers.hourlyRate',
        '<=',
        parseInt(maxRate)
      );
    });

  const [{ count }, internshipOffers] = await Promise.all([
    query
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),

    query
      .leftJoin('students', 'students.id', 'internshipJobOffers.postedBy')
      .select([
        'companies.id as companyId',
        'companies.name as companyName',
        'companies.imageUrl as companyLogo',
        'internshipJobOffers.id',
        'internshipJobOffers.role',
        'internshipJobOffers.location',
        'internshipJobOffers.hourlyRate',
        'internshipJobOffers.monthlyRate',
        'internshipJobOffers.createdAt',
        'students.id as posterId',
        'students.firstName as posterFirstName',
        'students.lastName as posterLastName',
        'students.profilePicture as posterProfilePicture',
      ])
      .orderBy('internshipJobOffers.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),
  ]);

  return {
    internshipOffers,
    totalInternshipOffers: Number(count),
  };
}

function CompanyFilter() {
  const { appliedCompany } = useLoaderData<typeof loader>();

  return (
    <FilterRoot>
      <FilterButton
        icon={<Briefcase />}
        popover
        selectedValues={
          appliedCompany
            ? [
                {
                  color: 'gray-100',
                  label: appliedCompany.name,
                  value: appliedCompany.id,
                },
              ]
            : []
        }
      >
        Company
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <CompanyList />
      </FilterPopover>
    </FilterRoot>
  );
}

function CompanyList() {
  const { allCompanies, appliedCompany } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  const filteredCompanies = allCompanies.filter((company) => {
    return new RegExp(search, 'i').test(company.name);
  });

  if (!filteredCompanies.length) {
    return <FilterEmptyMessage>No companies found</FilterEmptyMessage>;
  }

  return (
    <ul className="overflow-auto">
      {filteredCompanies.map((company) => {
        return (
          <FilterItem
            checked={company.id === appliedCompany?.id}
            key={company.id}
            label={company.name}
            name="company"
            value={company.id}
          />
        );
      })}
    </ul>
  );
}

function LocationFilter() {
  const [searchParams] = useSearchParams();
  const locations = searchParams.getAll('location');

  return (
    <FilterRoot multiple>
      <FilterButton
        icon={<MapPin />}
        popover
        selectedValues={locations.map((location) => ({
          color: 'purple-100',
          label: location,
          value: location,
        }))}
      >
        Location
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <LocationList />
      </FilterPopover>
    </FilterRoot>
  );
}

function LocationList() {
  const { allLocations } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const { search } = useFilterContext();
  const selectedLocations = searchParams.getAll('location');

  const filteredLocations = allLocations.filter((loc) => {
    return new RegExp(search, 'i').test(loc.location as string);
  });

  if (!filteredLocations.length) {
    return <FilterEmptyMessage>No locations found</FilterEmptyMessage>;
  }

  return (
    <ul className="overflow-auto">
      {filteredLocations.map((loc) => {
        const checked = selectedLocations.includes(loc.location as string);
        const value = loc.location as string;

        return (
          <FilterItem
            checked={checked}
            key={value}
            label={value}
            name="location"
            value={value}
          />
        );
      })}
    </ul>
  );
}

function DatePostedFilter() {
  const [searchParams] = useSearchParams();
  const since = searchParams.get('since');

  const options: FilterValue[] = [
    { color: 'lime-100', label: 'Last 24 Hours', value: '1' },
    { color: 'green-100', label: 'Last 7 Days', value: '7' },
    { color: 'cyan-100', label: 'Last 30 Days', value: '30' },
    { color: 'blue-100', label: 'Last 90 Days', value: '90' },
  ];

  const selectedValues = options.filter((option) => {
    return since === option.value;
  });

  return (
    <FilterRoot>
      <FilterButton icon={<Calendar />} popover selectedValues={selectedValues}>
        Date Posted
      </FilterButton>

      <FilterPopover>
        <ul>
          {options.map((option) => {
            return (
              <FilterItem
                checked={since === option.value}
                color={option.color}
                key={option.value}
                label={option.label}
                name="since"
                value={option.value}
              />
            );
          })}
        </ul>
      </FilterPopover>
    </FilterRoot>
  );
}
