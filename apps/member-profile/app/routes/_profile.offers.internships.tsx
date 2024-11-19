import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Outlet,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import { DollarSign, MapPin } from 'react-feather';

import { hourlyToMonthlyRate } from '@oyster/core/job-offers';
import { db } from '@oyster/db';
import { Pagination, Table, type TableColumnProps } from '@oyster/ui';
import {
  ClearFiltersButton,
  FilterButton,
  FilterEmptyMessage,
  FilterItem,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  type FilterValue,
  useFilterContext,
} from '@oyster/ui/filter';

import { CompanyColumn, CompanyFilter } from '@/shared/components';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { searchParams } = new URL(request.url);
  const {
    company,
    limit: _limit,
    page: _page,
  } = Object.fromEntries(searchParams);

  const limit = parseInt(_limit) || 50;
  const page = parseInt(_page) || 1;

  const [appliedCompany, allCompanies, allLocations, { offers, totalOffers }] =
    await Promise.all([
      getAppliedCompany(company),
      listAllCompanies(),
      listAllLocations(),
      listInternshipOffers({
        company,
        hourlyRate: searchParams.get('hourlyRate'),
        limit,
        locations: searchParams.getAll('location'),
        page,
      }),
    ]);

  return json({
    allCompanies,
    allLocations,
    appliedCompany,
    limit,
    offers,
    page,
    totalOffers,
  });
}

async function getAppliedCompany(companyFromSearch: string | null) {
  if (!companyFromSearch) {
    return undefined;
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

async function listAllCompanies() {
  const companies = await db
    .selectFrom('companies')
    .select(['id', 'name', 'imageUrl'])
    .where((eb) => {
      return eb.exists(() => {
        return eb
          .selectFrom('internshipJobOffers')
          .whereRef('companyId', '=', 'companies.id');
      });
    })
    .orderBy('name', 'asc')
    .execute();

  return companies;
}

async function listAllLocations() {
  const rows = await db
    .selectFrom('internshipJobOffers')
    .select('location')
    .distinct()
    .where('location', 'is not', null)
    .orderBy('location', 'asc')
    .execute();

  const locations = rows.map((row) => {
    return row.location;
  });

  return locations;
}

type ListInternshipOffersInput = {
  company: string | null;
  hourlyRate: string | null;
  limit: number;
  locations: string[];
  page: number;
};

async function listInternshipOffers({
  company,
  hourlyRate,
  limit,
  locations,
  page,
}: ListInternshipOffersInput) {
  const query = db
    .selectFrom('internshipJobOffers as internshipOffers')
    .leftJoin('companies', 'companies.id', 'internshipOffers.companyId')
    .$if(!!company, (qb) => {
      return qb.where((eb) => {
        return eb.or([
          eb('companies.id', '=', company),
          eb('companies.name', 'ilike', company),
        ]);
      });
    })
    .$if(!!hourlyRate && !!Number(hourlyRate), (qb) => {
      return qb.where('internshipOffers.hourlyRate', '>=', hourlyRate);
    })
    .$if(locations.length > 0, (qb) => {
      return qb.where('internshipOffers.location', 'in', locations);
    });

  const [{ count }, _offers] = await Promise.all([
    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),

    query
      .select([
        'companies.id as companyId',
        'companies.name as companyName',
        'companies.imageUrl as companyLogo',
        'internshipOffers.hourlyRate',
        'internshipOffers.id',
        'internshipOffers.location',
        'internshipOffers.role',
      ])
      .orderBy('internshipOffers.postedAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),
  ]);

  const formatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
  });

  const offers = _offers.map((offer) => {
    const hourlyRate = parseInt(offer.hourlyRate);
    const monthlyRate = hourlyToMonthlyRate(hourlyRate);

    return {
      ...offer,
      hourlyRate: formatter.format(hourlyRate) + '/hr',
      monthlyRate: formatter.format(monthlyRate) + '/mo',
    };
  });

  return {
    offers,
    totalOffers: Number(count),
  };
}

// Page

export default function InternshipOffersPage() {
  const { allCompanies, appliedCompany } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyFilter
            allCompanies={allCompanies}
            emptyMessage="No companies found that are linked to internship offers."
            selectedCompany={appliedCompany}
          />
          <HourlyRateFilter />
          <LocationFilter />
        </div>

        <ClearFiltersButton />
      </div>

      <InternshipOffersTable />
      <InternshipOffersPagination />
      <Outlet />
    </>
  );
}

// Table

type InternshipOfferInView = SerializeFrom<typeof loader>['offers'][number];

function InternshipOffersTable() {
  const { offers } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const columns: TableColumnProps<InternshipOfferInView>[] = [
    {
      displayName: 'Company',
      size: '240',
      render: (offer) => <CompanyColumn {...offer} />,
    },
    {
      displayName: 'Role',
      size: '280',
      render: (offer) => offer.role,
    },
    {
      displayName: 'Hourly Rate',
      size: '120',
      render: (offer) => offer.hourlyRate,
    },
    {
      displayName: 'Monthly Rate',
      size: '160',
      render: (offer) => offer.monthlyRate,
    },
    {
      displayName: 'Location',
      size: '200',
      render: (offer) => offer.location,
    },
  ];

  return (
    <Table
      columns={columns}
      data={offers}
      emptyMessage="No internship offers found matching the criteria."
      rowTo={({ id }) => {
        return {
          pathname: generatePath(Route['/offers/internships/:id'], { id }),
          search: searchParams.toString(),
        };
      }}
    />
  );
}

function InternshipOffersPagination() {
  const { limit, offers, page, totalOffers } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={offers.length}
      page={page}
      pageSize={limit}
      totalCount={totalOffers}
    />
  );
}

// Filters

function HourlyRateFilter() {
  const [searchParams] = useSearchParams();

  const hourlyRate = searchParams.get('hourlyRate');

  const options: FilterValue[] = [
    { color: 'red-100', label: '> $20/hr', value: '20' },
    { color: 'orange-100', label: '> $30/hr', value: '30' },
    { color: 'amber-100', label: '> $40/hr', value: '40' },
    { color: 'cyan-100', label: '> $50/hr', value: '50' },
    { color: 'green-100', label: '> $60/hr', value: '60' },
    { color: 'lime-100', label: '> $70/hr', value: '70' },
  ];

  const selectedValues = options.filter((option) => {
    return hourlyRate === option.value;
  });

  return (
    <FilterRoot>
      <FilterButton
        icon={<DollarSign />}
        popover
        selectedValues={selectedValues}
      >
        Hourly Rate
      </FilterButton>

      <FilterPopover>
        <ul>
          {options.map((option) => {
            return (
              <FilterItem
                checked={hourlyRate === option.value}
                color={option.color}
                key={option.value}
                label={option.label}
                name="hourlyRate"
                value={option.value}
              />
            );
          })}
        </ul>
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
        selectedValues={locations.map((location) => {
          return {
            color: 'purple-100',
            label: location,
            value: location,
          };
        })}
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
  const [searchParams] = useSearchParams();
  const { allLocations } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredLocations = allLocations;

  if (search) {
    filteredLocations = allLocations.filter((location) => {
      return new RegExp(search, 'i').test(location);
    });
  }

  if (!filteredLocations.length) {
    return <FilterEmptyMessage>No locations found.</FilterEmptyMessage>;
  }

  const selectedLocations = searchParams.getAll('location');

  return (
    <ul className="overflow-auto">
      {filteredLocations.map((location) => {
        return (
          <FilterItem
            checked={selectedLocations.includes(location)}
            key={location}
            label={location}
            name="location"
            value={location}
          />
        );
      })}
    </ul>
  );
}
