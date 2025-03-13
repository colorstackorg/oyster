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
import dayjs from 'dayjs';
import { DollarSign, MapPin } from 'react-feather';

import { track } from '@oyster/core/mixpanel';
import { db } from '@oyster/db';
import { Pagination, Table, type TableColumnProps, Text } from '@oyster/ui';
import {
  FilterButton,
  FilterEmptyMessage,
  FilterItem,
  FilterList,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  type FilterValue,
  ResetFiltersButton,
  useFilterContext,
} from '@oyster/ui/filter';
import { toEscapedString } from '@oyster/utils';

import { CompanyColumn, CompanyFilter } from '@/shared/components';
import {
  OfferAggregation,
  OfferAggregationGroup,
  TotalCompensationTooltip,
} from '@/shared/components/offer';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { pathname, searchParams } = new URL(request.url);
  const {
    company,
    limit: _limit,
    page: _page,
  } = Object.fromEntries(searchParams);

  const limit = parseInt(_limit) || 50;
  const page = parseInt(_page) || 1;

  const [
    appliedCompany,
    allCompanies,
    allLocations,
    { averageBaseSalary, averageTotalCompensation, offers, totalOffers },
  ] = await Promise.all([
    getAppliedCompany(company),
    listAllCompanies(),
    listAllLocations(),
    listFullTimeOffers({
      company,
      limit,
      locations: searchParams.getAll('location'),
      page,
      totalCompensation: searchParams.getAll('totalCompensation'),
    }),
  ]);

  if (pathname === Route['/offers/full-time']) {
    track({
      event: 'Page Viewed',
      properties: { Page: 'Compensation' },
      request,
      user: user(session),
    });
  }

  return json({
    allCompanies,
    allLocations,
    appliedCompany,
    averageBaseSalary,
    averageTotalCompensation,
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
          .selectFrom('fullTimeOffers')
          .whereRef('fullTimeOffers.companyId', '=', 'companies.id');
      });
    })
    .orderBy('name', 'asc')
    .execute();

  return companies;
}

async function listAllLocations() {
  const rows = await db
    .selectFrom('fullTimeOffers')
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

type ListFullTimeOffersInput = {
  company: string | null;
  limit: number;
  locations: string[];
  page: number;
  totalCompensation: string[];
};

async function listFullTimeOffers({
  company,
  limit,
  locations,
  page,
  totalCompensation,
}: ListFullTimeOffersInput) {
  const query = db
    .selectFrom('fullTimeOffers')
    .leftJoin('companies', 'companies.id', 'fullTimeOffers.companyId')
    .$if(!!company, (qb) => {
      return qb.where((eb) => {
        return eb.or([
          eb('companies.id', '=', company),
          eb('companies.name', 'ilike', company),
        ]);
      });
    })
    .$if(locations.length > 0, (qb) => {
      return qb.where('fullTimeOffers.location', 'in', locations);
    })
    .$if(!!totalCompensation.length, (qb) => {
      const conditions = totalCompensation
        .map((range) => {
          const [min, max] = range.trim().split('-');

          return [Number(min), Number(max)];
        })
        .filter(([min, max]) => {
          return !isNaN(min) && !isNaN(max);
        });

      if (!conditions.length) {
        return qb;
      }

      return qb.where((eb) => {
        return eb.or(
          conditions.map(([min, max]) => {
            return eb.and([
              eb('fullTimeOffers.totalCompensation', '>=', min.toString()),
              eb('fullTimeOffers.totalCompensation', '<=', max.toString()),
            ]);
          })
        );
      });
    });

  const [aggregation, _offers] = await Promise.all([
    query
      .select([
        (eb) => {
          return eb.fn
            .avg<string>('fullTimeOffers.baseSalary')
            .as('averageBaseSalary');
        },
        (eb) => {
          return eb.fn
            .avg<string>('fullTimeOffers.totalCompensation')
            .as('averageTotalCompensation');
        },
        (eb) => {
          return eb.fn.countAll<string>().as('totalOffers');
        },
      ])
      .executeTakeFirstOrThrow(),

    query
      .select([
        'companies.id as companyId',
        'companies.name as companyName',
        'companies.imageUrl as companyLogo',
        'fullTimeOffers.baseSalary',
        'fullTimeOffers.id',
        'fullTimeOffers.location',
        'fullTimeOffers.performanceBonus',
        'fullTimeOffers.postedAt',
        'fullTimeOffers.role',
        'fullTimeOffers.signOnBonus',
        'fullTimeOffers.totalCompensation',
        'fullTimeOffers.totalStock',
      ])
      .orderBy('fullTimeOffers.postedAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),
  ]);

  const formatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  });

  const offers = _offers.map(
    ({ performanceBonus, postedAt, signOnBonus, totalStock, ...offer }) => {
      const annualBonus =
        (Number(performanceBonus) || 0) + (Number(signOnBonus) || 0) / 4;

      return {
        ...offer,
        annualBonus: formatter.format(annualBonus),
        annualStock: formatter.format((Number(totalStock) || 0) / 4),
        baseSalary: formatter.format(Number(offer.baseSalary)),
        postedAt: dayjs().to(postedAt),
        totalCompensation: formatter.format(Number(offer.totalCompensation)),
      };
    }
  );

  const averageBaseSalary = Number(aggregation.averageBaseSalary);
  const averageTotalCompensation = Number(aggregation.averageTotalCompensation);

  return {
    averageBaseSalary: formatter.format(averageBaseSalary),
    averageTotalCompensation: formatter.format(averageTotalCompensation),
    offers,
    totalOffers: Number(aggregation.totalOffers),
  };
}

// Page

export default function FullTimeOffersPage() {
  const {
    allCompanies,
    appliedCompany,
    averageBaseSalary,
    averageTotalCompensation,
    totalOffers,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyFilter
            allCompanies={allCompanies}
            emptyMessage="No companies found that are linked to full-time offers."
            selectedCompany={appliedCompany}
          />
          <TotalCompensationFilter />
          <LocationFilter />
          <ResetFiltersButton />
        </div>
      </div>

      <OfferAggregationGroup>
        <OfferAggregation
          label={
            <>
              Average Total Compensation <TotalCompensationTooltip />
            </>
          }
          value={averageTotalCompensation}
        />
        <OfferAggregation
          label="Average Base Salary"
          value={averageBaseSalary}
        />
        <OfferAggregation label="Total Offers" value={totalOffers} />
      </OfferAggregationGroup>

      <FullTimeOffersTable />
      <FullTimeOffersPagination />
      <Outlet />
    </>
  );
}

// Table

type FullTimeOfferInView = SerializeFrom<typeof loader>['offers'][number];

function FullTimeOffersTable() {
  const { offers } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const columns: TableColumnProps<FullTimeOfferInView>[] = [
    {
      displayName: 'Company',
      size: '200',
      render: (offer) => <CompanyColumn {...offer} />,
    },
    {
      displayName: 'Role',
      size: '240',
      render: (offer) => offer.role,
    },
    {
      displayName: 'Total Compensation',
      size: '160',
      render: (offer) => {
        return (
          <Text
            as="span"
            className="rounded-md bg-yellow-50 px-2 py-1"
            weight="500"
          >
            {offer.totalCompensation}
          </Text>
        );
      },
    },
    {
      displayName: 'Base Salary',
      size: '120',
      render: (offer) => offer.baseSalary,
    },
    {
      displayName: 'Stock (/yr)',
      size: '120',
      render: (offer) => offer.annualStock,
    },
    {
      displayName: 'Bonus (/yr)',
      size: '160',
      render: (offer) => offer.annualBonus,
    },
    {
      displayName: 'Location',
      size: '240',
      render: (offer) => offer.location,
    },
    {
      displayName: '',
      size: '80',
      render: (offer) => {
        return (
          <Text as="span" color="gray-500" variant="sm">
            {offer.postedAt} ago
          </Text>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={offers}
      emptyMessage="No full-time offers found matching the criteria."
      rowTo={({ id }) => {
        return {
          pathname: generatePath(Route['/offers/full-time/:id'], { id }),
          search: searchParams.toString(),
        };
      }}
    />
  );
}

function FullTimeOffersPagination() {
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

function TotalCompensationFilter() {
  const [searchParams] = useSearchParams();

  const ranges = searchParams.getAll('totalCompensation');

  const options: FilterValue[] = [
    { color: 'cyan-100', label: '$0-100K', value: '0-100000' },
    { color: 'orange-100', label: '$100-125K', value: '100000-125000' },
    { color: 'amber-100', label: '$125-150K', value: '125000-150000' },
    { color: 'pink-100', label: '$150-175K', value: '150000-175000' },
    { color: 'green-100', label: '$175-200K', value: '175000-200000' },
    { color: 'lime-100', label: '$200-250K', value: '200000-250000' },
    { color: 'purple-100', label: '$250K+', value: '250000-1000000' },
  ];

  const selectedValues = options.filter((option) => {
    return ranges.includes(option.value);
  });

  return (
    <FilterRoot multiple selectedValues={selectedValues}>
      <FilterButton icon={<DollarSign />} popover>
        Total Compensation
      </FilterButton>

      <FilterPopover>
        <FilterList height="max">
          {options.map((option) => {
            return (
              <FilterItem
                color={option.color}
                key={option.value}
                label={option.label}
                name="totalCompensation"
                value={option.value}
              />
            );
          })}
        </FilterList>
      </FilterPopover>
    </FilterRoot>
  );
}

function LocationFilter() {
  const [searchParams] = useSearchParams();

  const locations = searchParams.getAll('location');

  return (
    <FilterRoot
      multiple
      selectedValues={locations.map((location) => {
        return {
          color: 'purple-100',
          label: location,
          value: location,
        };
      })}
    >
      <FilterButton icon={<MapPin />} popover>
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
  const { search } = useFilterContext();

  let filteredLocations = allLocations;

  if (search) {
    const regex = new RegExp(toEscapedString(search), 'i');

    filteredLocations = allLocations.filter((location) => {
      return regex.test(location);
    });
  }

  if (!filteredLocations.length) {
    return <FilterEmptyMessage>No locations found.</FilterEmptyMessage>;
  }

  return (
    <FilterList>
      {filteredLocations.map((location) => {
        return (
          <FilterItem
            key={location}
            label={location}
            name="location"
            value={location}
          />
        );
      })}
    </FilterList>
  );
}
