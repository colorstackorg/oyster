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

import { track } from '@oyster/core/mixpanel';
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

  const { pathname, searchParams } = new URL(request.url);
  const { limit: _limit, page: _page } = Object.fromEntries(searchParams);

  const limit = parseInt(_limit) || 50;
  const page = parseInt(_page) || 1;

  const [
    appliedCompany,
    allCompanies,
    allLocations,
    { fullTimeOffers, totalFullTimeOffers },
  ] = await Promise.all([
    getAppliedCompany(searchParams),
    listAllCompanies(),
    listAllLocations(),
    listFullTimeOffers(searchParams, { limit, memberId, page }),
  ]);

  if (pathname === Route['/offers/full-time']) {
    track({
      event: 'Page Viewed',
      properties: { Page: 'Compensation' },
      request,
      user: memberId,
    });
  }

  const formatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  });

  const offers = fullTimeOffers.map((offer) => {
    return {
      ...offer,
      baseSalary: formatter.format(Number(offer.baseSalary)),
      performanceBonus: formatter.format(Number(offer.performanceBonus || 0)),
      signOnBonus: formatter.format(Number(offer.signOnBonus || 0)),
      stockPerYear: formatter.format(Number(offer.totalStock || 0) / 4),
      totalCompensation: formatter.format(Number(offer.totalCompensation)),
    };
  });

  return json({
    allCompanies,
    allLocations,
    appliedCompany,
    limit,
    fullTimeOffers: offers,
    page,
    totalFullTimeOffers,
  });
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

export default function FullTimeOffersPage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyFilter />
          <TotalCompensationFilter />
          <LocationFilter />
          <DatePostedFilter />
        </div>

        {/* <ClearFiltersButton /> */}
      </div>

      <FullTimeOffersTable />
      <FullTimeOffersPagination />
      <Outlet />
    </>
  );
}

// Table

type FullTimeOfferInView = SerializeFrom<
  typeof loader
>['fullTimeOffers'][number];

function FullTimeOffersTable() {
  const { fullTimeOffers } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const columns: TableColumnProps<FullTimeOfferInView>[] = [
    {
      displayName: 'Company',
      size: '200',
      render: (fullTimeOffer) => <CompanyColumn {...fullTimeOffer} />,
    },
    {
      displayName: 'Role',
      size: '240',
      render: (fullTimeOffer) => fullTimeOffer.role,
    },
    {
      displayName: 'Location',
      size: '160',
      render: (fullTimeOffer) => fullTimeOffer.location,
    },
    {
      displayName: 'Total Compensation',
      size: '160',
      render: (fullTimeOffer) => fullTimeOffer.totalCompensation,
    },
    {
      displayName: 'Base Salary',
      size: '160',
      render: (fullTimeOffer) => fullTimeOffer.baseSalary,
    },
    {
      displayName: 'Stock (/yr)',
      size: '160',
      render: (fullTimeOffer) => fullTimeOffer.stockPerYear,
    },
    {
      displayName: 'Performance Bonus (Maximum)',
      size: '240',
      render: (fullTimeOffer) => fullTimeOffer.performanceBonus,
    },
    {
      displayName: 'Sign-On Bonus',
      size: '120',
      render: (fullTimeOffer) => fullTimeOffer.signOnBonus,
    },
  ];

  return (
    <Table
      columns={columns}
      data={fullTimeOffers}
      emptyMessage="No full-time offers found."
      rowTo={(row) => {
        return {
          pathname: generatePath(Route['/offers/full-time/:id'], {
            id: row.id,
          }),
          search: searchParams.toString(),
        };
      }}
    />
  );
}

function CompanyColumn({
  companyId,
  companyLogo,
  companyName,
}: FullTimeOfferInView) {
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
          .selectFrom('fullTimeJobOffers')
          .whereRef('fullTimeJobOffers.companyId', '=', 'companies.id');
      });
    })
    .orderBy('name', 'asc')
    .execute();

  return companies;
}

function FullTimeOffersPagination() {
  const { limit, fullTimeOffers, page, totalFullTimeOffers } =
    useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={fullTimeOffers.length}
      page={page}
      pageSize={limit}
      totalCount={totalFullTimeOffers}
    />
  );
}

type ListFullTimeOffersOptions = {
  limit: number;
  memberId: string;
  page: number;
};

async function listFullTimeOffers(
  searchParams: URLSearchParams,
  { limit, memberId, page }: ListFullTimeOffersOptions
) {
  const { company, since, minSalary, maxSalary } =
    Object.fromEntries(searchParams);
  const locations = searchParams.getAll('location');

  const query = db
    .selectFrom('fullTimeJobOffers')
    .leftJoin('companies', 'companies.id', 'fullTimeJobOffers.companyId')
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

      return qb.where('fullTimeJobOffers.createdAt', '>=', date);
    })
    .$if(locations.length > 0, (qb) => {
      return qb.where((eb) => {
        return eb.or(
          locations.map((location) => {
            return eb('fullTimeJobOffers.location', '=', location);
          })
        );
      });
    })
    .$if(!!minSalary, (qb) => {
      return qb.where(
        'fullTimeJobOffers.totalCompensation',
        '>=',
        minSalary || ''
      );
    })
    .$if(!!maxSalary, (qb) => {
      return qb.where(
        'fullTimeJobOffers.totalCompensation',
        '<=',
        maxSalary || ''
      );
    });

  const [{ count }, fullTimeOffers] = await Promise.all([
    query
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),

    query
      .leftJoin('students', 'students.id', 'fullTimeJobOffers.postedBy')
      .select([
        'companies.id as companyId',
        'companies.name as companyName',
        'companies.imageUrl as companyLogo',
        'fullTimeJobOffers.id',
        'fullTimeJobOffers.role',
        'fullTimeJobOffers.location',
        'fullTimeJobOffers.performanceBonus',
        'fullTimeJobOffers.totalCompensation',
        'fullTimeJobOffers.baseSalary',
        'fullTimeJobOffers.totalStock',
        'fullTimeJobOffers.signOnBonus',
        'students.id as posterId',
        'students.firstName as posterFirstName',
        'students.lastName as posterLastName',
        'students.profilePicture as posterProfilePicture',
      ])
      .orderBy('fullTimeJobOffers.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),
  ]);

  return {
    fullTimeOffers,
    totalFullTimeOffers: Number(count),
  };
}

async function listAllLocations() {
  const locations = await db
    .selectFrom('fullTimeJobOffers')
    .select('location')
    .distinct()
    .where('location', 'is not', null)
    .orderBy('location', 'asc')
    .execute();

  return locations;
}

// Filters

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

function TotalCompensationFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const minSalary = searchParams.get('minSalary');
  const maxSalary = searchParams.get('maxSalary');

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
          minSalary || maxSalary
            ? [
                {
                  color: 'green-100',
                  label: `${minSalary ? formatter.format(parseInt(minSalary)) : '$0'} - ${
                    maxSalary ? formatter.format(parseInt(maxSalary)) : '∞'
                  }`,
                  value: `${minSalary || '0'}-${maxSalary || '∞'}`,
                },
              ]
            : []
        }
      >
        Total Compensation Range
      </FilterButton>

      <FilterPopover>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Min Salary
              </label>
              <input
                type="number"
                name="minSalary"
                value={minSalary || ''}
                onChange={handleChange}
                placeholder="0"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Max Salary
              </label>
              <input
                type="number"
                name="maxSalary"
                value={maxSalary || ''}
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
