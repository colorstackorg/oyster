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
import { type ExpressionBuilder, sql } from 'kysely';
import { BookOpen, Briefcase, Calendar, Globe, MapPin } from 'react-feather';
import { z } from 'zod';

import { listMembersInDirectory } from '@oyster/core/member-profile/server';
import {
  ListMembersInDirectoryWhere,
  ListSearchParams,
} from '@oyster/core/member-profile/ui';
import { type DB, db } from '@oyster/db';
import { ISO8601Date } from '@oyster/types';
import { Dashboard, Pagination, ProfilePicture, Text } from '@oyster/ui';
import {
  FilterEmptyMessage,
  FilterItem,
  FilterList,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  FilterTrigger,
  type FilterValue,
  ResetFiltersButton,
  useFilterContext,
} from '@oyster/ui/filter';
import { run, toEscapedString } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { useMixpanelTracker } from '@/shared/hooks/use-mixpanel-tracker';
import { ensureUserAuthenticated } from '@/shared/session.server';
import { formatName } from '@/shared/utils/format.utils';

const DirectorySearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
})
  .merge(ListMembersInDirectoryWhere)
  .extend({ joinedDirectoryDate: ISO8601Date.optional().catch(undefined) });

type DirectorySearchParams = z.infer<typeof DirectorySearchParams>;

const Coordinates = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .transform((value) => value?.split(',')?.map(Number))
  .catch(null);

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const values = Object.fromEntries(url.searchParams);

  const searchParams = DirectorySearchParams.extend({
    hometown: Coordinates,
    location: Coordinates,
  }).parse({
    ...values,
    graduationYear: url.searchParams.getAll('graduationYear'),
  });

  const { hometown, location, limit, page, ...where } = searchParams;

  const [
    allCompanies,
    allEthnicities,
    allGraduationYears,
    allHometowns,
    allLocations,
    allSchools,
    { members, totalCount },
  ] = await Promise.all([
    listAllCompanies(),
    listAllEthnicities(),
    listAllGraduationYears(),
    listAllHometowns(),
    listAllLocations(),
    listAllSchools(),
    listMembersInDirectory({
      limit,
      page,
      where: {
        ...where,
        ...(searchParams.joinedDirectoryDate &&
          run(() => {
            const date = dayjs(searchParams.joinedDirectoryDate).tz(
              'America/Los_Angeles',
              true
            );

            return {
              joinedDirectoryAfter: date.startOf('day').toDate(),
              joinedDirectoryBefore: date.endOf('day').toDate(),
            };
          })),
        hometown: null,
        hometownLatitude: hometown?.[1],
        hometownLongitude: hometown?.[0],
        location: null,
        locationLatitude: location?.[1],
        locationLongitude: location?.[0],
      },
    }),
  ]);

  return json({
    allCompanies,
    allEthnicities,
    allGraduationYears,
    allHometowns,
    allLocations,
    allSchools,
    limit: searchParams.limit,
    members,
    page: searchParams.page,
    totalCount,
  });
}

type Company = {
  count: number;
  id: string;
  name: string;
};

async function listAllCompanies() {
  const rows = await db
    .selectFrom('workExperiences')
    .innerJoin('companies', 'companies.id', 'workExperiences.companyId')
    .innerJoin('students', 'students.id', 'workExperiences.studentId')
    .select([
      'companies.id',
      'companies.name',
      (eb) => {
        return eb.fn.count('workExperiences.studentId').distinct().as('count');
      },
    ])
    .groupBy('companies.id')
    .where('students.joinedMemberDirectoryAt', 'is not', null)
    .where('workExperiences.deletedAt', 'is', null)
    .orderBy('count', 'desc')
    .orderBy('companies.name', 'asc')
    .execute();

  const companies = rows as Company[];

  return companies;
}

type Ethnicity = {
  code: string;
  count: number;
  demonym: string;
  flagEmoji: string;
};

async function listAllEthnicities() {
  const rows = await db
    .selectFrom('memberEthnicities')
    .leftJoin('countries', 'countries.code', 'memberEthnicities.countryCode')
    .leftJoin('students', 'students.id', 'memberEthnicities.studentId')
    .select([
      'countries.code',
      'countries.demonym',
      'countries.flagEmoji',
      (eb) => {
        return eb.fn
          .count('memberEthnicities.studentId')
          .distinct()
          .as('count');
      },
    ])
    .where('students.joinedMemberDirectoryAt', 'is not', null)
    .groupBy('countries.code')
    .orderBy('count', 'desc')
    .orderBy('countries.demonym', 'asc')
    .execute();

  const ethnicities = rows as Ethnicity[];

  return ethnicities;
}

async function listAllGraduationYears() {
  const years = await db
    .selectFrom('students')
    .select(['graduationYear', (eb) => eb.fn.countAll().as('count')])
    .where('students.joinedMemberDirectoryAt', 'is not', null)
    .groupBy('graduationYear')
    .orderBy('graduationYear', 'desc')
    .execute();

  return years;
}

function coordinates(
  eb: ExpressionBuilder<DB, 'students'>,
  column: 'currentLocationCoordinates' | 'hometownCoordinates'
) {
  return sql<string>`concat(${eb.ref(column)}[0], ',', ${eb.ref(column)}[1])`;
}

async function listAllHometowns() {
  const rows = await db
    .selectFrom('students')
    .select([
      'hometown',
      (eb) => coordinates(eb, 'hometownCoordinates').as('coordinates'),
      (eb) => eb.fn.countAll().as('count'),
    ])
    .groupBy(['hometown', (eb) => coordinates(eb, 'hometownCoordinates')])
    .where('hometown', 'is not', null)
    .where('hometownCoordinates', 'is not', null)
    .where('students.joinedMemberDirectoryAt', 'is not', null)
    .orderBy('count', 'desc')
    .orderBy('hometown', 'asc')
    .execute();

  // This is janky, but we're doing this because there are some locations
  // that have the same coordinates. We should figure out a way to do this
  // unique check in the database while still maintaining our sort order.

  const map: Record<
    string,
    { coordinates: string; count: number; name: string }
  > = {};

  rows.forEach((row) => {
    if (row.coordinates in map) {
      map[row.coordinates].count += Number(row.count);

      return;
    }

    map[row.coordinates] = {
      coordinates: row.coordinates,
      count: Number(row.count),
      name: row.hometown!,
    };
  });

  const hometowns = Object.values(map).sort((a, b) => b.count - a.count);

  return hometowns;
}

async function listAllLocations() {
  const rows = await db
    .selectFrom('students')
    .select([
      'currentLocation',
      (eb) => coordinates(eb, 'currentLocationCoordinates').as('coordinates'),
      (eb) => eb.fn.countAll().as('count'),
    ])
    .groupBy([
      'currentLocation',
      (eb) => coordinates(eb, 'currentLocationCoordinates'),
    ])
    .where('currentLocation', 'is not', null)
    .where('currentLocationCoordinates', 'is not', null)
    .where('students.joinedMemberDirectoryAt', 'is not', null)
    .orderBy('count', 'desc')
    .orderBy('currentLocation', 'asc')
    .execute();

  // This is janky, but we're doing this because there are some locations
  // that have the same coordinates. We should figure out a way to do this
  // unique check in the database while still maintaining our sort order.

  const map: Record<
    string,
    { coordinates: string; count: number; name: string }
  > = {};

  rows.forEach((row) => {
    if (row.coordinates in map) {
      map[row.coordinates].count += Number(row.count);

      return;
    }

    map[row.coordinates] = {
      coordinates: row.coordinates,
      count: Number(row.count),
      name: row.currentLocation!,
    };
  });

  const locations = Object.values(map).sort((a, b) => b.count - a.count);

  return locations;
}

async function listAllSchools() {
  const schools = await db
    .selectFrom('schools')
    .innerJoin(
      (eb) => {
        return eb
          .selectFrom('students')
          .select(['students.id as studentId', 'schoolId'])
          .where('joinedMemberDirectoryAt', 'is not', null)
          .union(
            // This union automatically removes duplicates...
            eb
              .selectFrom('educations')
              .innerJoin('students', 'students.id', 'educations.studentId')
              .select(['educations.studentId', 'educations.schoolId'])
              .where('students.joinedMemberDirectoryAt', 'is not', null)
              .where('educations.deletedAt', 'is', null)
          )
          .as('combined');
      },
      (join) => {
        return join.onRef('schools.id', '=', 'combined.schoolId');
      }
    )
    .select([
      'schools.id',
      'schools.name',
      (eb) => eb.fn.count('combined.studentId').as('count'),
    ])
    .groupBy('schools.id')
    .orderBy('count', 'desc')
    .orderBy('schools.name', 'asc')
    .execute();

  return schools;
}

export function ErrorBoundary() {
  return <></>;
}

export default function DirectoryPage() {
  return (
    <>
      <Text variant="2xl">Directory 🗂️</Text>

      <div className="flex flex-wrap items-center gap-4">
        <Dashboard.SearchForm placeholder="Search by name or email..." />

        <div className="flex flex-wrap items-center gap-2">
          <SchoolFilter />
          <CompanyFilter />
          <LocationFilter />
          <EthnicityFilter />
          <GraduationYearFilter />
          <HometownFilter />
          <ResetFiltersButton />
        </div>
      </div>

      <MembersGrid />
      <DirectoryPagination />
      <Outlet />
    </>
  );
}

function DirectoryPagination() {
  const { limit, members, page, totalCount } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={members.length}
      page={page}
      pageSize={limit}
      totalCount={totalCount}
    />
  );
}

function MembersGrid() {
  const { members } = useLoaderData<typeof loader>();

  if (!members.length) {
    return (
      <div className="mt-4">
        <Text color="gray-500">There were no members found.</Text>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 overflow-auto @[800px]:grid-cols-2 @[1200px]:grid-cols-3">
      {members.map((member) => {
        return <MemberItem key={member.id} member={member} />;
      })}
    </ul>
  );
}

type MemberInView = SerializeFrom<typeof loader>['members'][number];

function MemberItem({ member }: { member: MemberInView }) {
  const { trackFromClient } = useMixpanelTracker();

  return (
    <li>
      <Link
        className="grid grid-cols-[3rem,1fr] items-center gap-4 rounded-2xl p-2 hover:bg-gray-100 sm:grid-cols-[4rem,1fr]"
        onClick={() => {
          trackFromClient({
            event: 'Directory - Profile Clicked',
            properties: undefined,
          });
        }}
        to={generatePath(Route['/directory/:id'], { id: member.id })}
      >
        <ProfilePicture
          initials={member.firstName[0] + member.lastName[0]}
          src={member.profilePicture || undefined}
          size="64"
        />

        <div>
          <Text variant="xl">
            {formatName({
              firstName: member.firstName,
              lastName: member.lastName,
              preferredName: member.preferredName,
            })}
          </Text>

          <Text className="line-clamp-2" color="gray-500" variant="sm">
            {member.headline}
          </Text>
        </div>
      </Link>
    </li>
  );
}

// Filtering

function CompanyFilter() {
  const [searchParams] = useSearchParams();
  const { allCompanies } = useLoaderData<typeof loader>();

  const company = searchParams.get('company');

  const options: FilterValue[] = allCompanies.map((value) => {
    return {
      color: 'pink-100',
      label: value.name,
      value: value.id,
    };
  });

  const selectedValues = options.filter((value) => {
    return company === value.value;
  });

  return (
    <FilterRoot name="company" selectedValues={selectedValues}>
      <FilterTrigger icon={<Briefcase />}>Company</FilterTrigger>

      <FilterPopover>
        <FilterSearch />
        <CompanyList />
      </FilterPopover>
    </FilterRoot>
  );
}

function CompanyList() {
  const { allCompanies } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredCompanies = allCompanies;

  if (search) {
    const regex = new RegExp(toEscapedString(search), 'i');

    filteredCompanies = allCompanies.filter((company) => {
      return regex.test(company.name);
    });
  }

  if (!filteredCompanies.length) {
    return <FilterEmptyMessage>No companies found.</FilterEmptyMessage>;
  }

  return (
    <FilterList>
      {filteredCompanies.map((company) => {
        return (
          <FilterItem
            key={company.id}
            label={`${company.name} (${company.count})`}
            value={company.id}
          />
        );
      })}
    </FilterList>
  );
}

function EthnicityFilter() {
  const [searchParams] = useSearchParams();
  const { allEthnicities } = useLoaderData<typeof loader>();

  const ethnicity = searchParams.get('ethnicity');

  const options: FilterValue[] = allEthnicities.map((value) => {
    return {
      color: 'lime-100',
      label: value.flagEmoji + ' ' + value.demonym,
      value: value.code,
    };
  });

  const selectedValues = options.filter((value) => {
    return ethnicity === value.value;
  });

  return (
    <FilterRoot name="ethnicity" selectedValues={selectedValues}>
      <FilterTrigger icon={<Globe />}>Ethnicity</FilterTrigger>

      <FilterPopover>
        <FilterSearch />
        <EthnicityList />
      </FilterPopover>
    </FilterRoot>
  );
}

function EthnicityList() {
  const { allEthnicities } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredEthnicities = allEthnicities;

  if (search) {
    const regex = new RegExp(toEscapedString(search), 'i');

    filteredEthnicities = allEthnicities.filter((ethnicity) => {
      return regex.test(ethnicity.demonym);
    });
  }

  if (!filteredEthnicities.length) {
    return <FilterEmptyMessage>No ethnicities found.</FilterEmptyMessage>;
  }

  return (
    <FilterList>
      {filteredEthnicities.map((ethnicity) => {
        return (
          <FilterItem
            key={ethnicity.code}
            label={`${ethnicity.flagEmoji} ${ethnicity.demonym} (${ethnicity.count})`}
            value={ethnicity.code}
          />
        );
      })}
    </FilterList>
  );
}

function GraduationYearFilter() {
  const [searchParams] = useSearchParams();
  const { allGraduationYears } = useLoaderData<typeof loader>();

  const graduationYears = searchParams.getAll('graduationYear');

  const options: FilterValue[] = allGraduationYears.map((value) => {
    return {
      color: 'amber-100',
      label: value.graduationYear,
      value: value.graduationYear,
    };
  });

  const selectedValues = options.filter((value) => {
    return graduationYears.includes(value.value);
  });

  return (
    <FilterRoot multiple name="graduationYear" selectedValues={selectedValues}>
      <FilterTrigger icon={<Calendar />}>Graduation Year</FilterTrigger>

      <FilterPopover>
        <FilterList>
          {allGraduationYears.map((year) => {
            return (
              <FilterItem
                key={year.graduationYear}
                label={`${year.graduationYear} (${year.count})`}
                value={year.graduationYear}
              />
            );
          })}
        </FilterList>
      </FilterPopover>
    </FilterRoot>
  );
}

function HometownFilter() {
  const [searchParams] = useSearchParams();
  const { allHometowns } = useLoaderData<typeof loader>();

  const hometown = searchParams.get('hometown');

  const options: FilterValue[] = allHometowns.map((value) => {
    return {
      color: 'orange-100',
      label: value.name,
      value: value.coordinates,
    };
  });

  const selectedValues = options.filter((value) => {
    return hometown === value.value;
  });

  return (
    <FilterRoot name="hometown" selectedValues={selectedValues}>
      <FilterTrigger icon={<MapPin />}>Hometown</FilterTrigger>

      <FilterPopover align="right">
        <FilterSearch />
        <HometownList />
      </FilterPopover>
    </FilterRoot>
  );
}

function HometownList() {
  const { allHometowns } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredHometowns = allHometowns;

  if (search) {
    const regex = new RegExp(toEscapedString(search), 'i');

    filteredHometowns = allHometowns.filter((hometown) => {
      return regex.test(hometown.name);
    });
  }

  if (!filteredHometowns.length) {
    return <FilterEmptyMessage>No hometowns found.</FilterEmptyMessage>;
  }

  return (
    <>
      <FilterList>
        {filteredHometowns.map((hometown) => {
          return (
            <FilterItem
              key={hometown.coordinates}
              label={`${hometown.name} (${hometown.count})`}
              value={hometown.coordinates}
            />
          );
        })}
      </FilterList>

      <FilterEmptyMessage>
        Results will include members within a 25 mile radius of the selected
        location.
      </FilterEmptyMessage>
    </>
  );
}

function LocationFilter() {
  const [searchParams] = useSearchParams();
  const { allLocations } = useLoaderData<typeof loader>();

  const location = searchParams.get('location');

  const options: FilterValue[] = allLocations.map((value) => {
    return {
      color: 'purple-100',
      label: value.name,
      value: value.coordinates,
    };
  });

  const selectedValues = options.filter((value) => {
    return location === value.value;
  });

  return (
    <FilterRoot name="location" selectedValues={selectedValues}>
      <FilterTrigger icon={<MapPin />}>Location</FilterTrigger>

      <FilterPopover align="right">
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
      return regex.test(location.name);
    });
  }

  if (!filteredLocations.length) {
    return <FilterEmptyMessage>No locations found.</FilterEmptyMessage>;
  }

  return (
    <>
      <FilterList>
        {filteredLocations.map((location) => {
          return (
            <FilterItem
              key={location.coordinates}
              label={`${location.name} (${location.count})`}
              value={location.coordinates}
            />
          );
        })}
      </FilterList>

      <FilterEmptyMessage>
        Results will include members within a 25 mile radius of the selected
        location.
      </FilterEmptyMessage>
    </>
  );
}

function SchoolFilter() {
  const [searchParams] = useSearchParams();
  const { allSchools } = useLoaderData<typeof loader>();

  const school = searchParams.get('school');

  const options: FilterValue[] = allSchools.map((value) => {
    return {
      color: 'cyan-100',
      label: value.name,
      value: value.id,
    };
  });

  const selectedValues = options.filter((value) => {
    return school === value.value;
  });

  return (
    <FilterRoot name="school" selectedValues={selectedValues}>
      <FilterTrigger icon={<BookOpen />}>School</FilterTrigger>

      <FilterPopover>
        <FilterSearch />
        <SchoolList />
      </FilterPopover>
    </FilterRoot>
  );
}

function SchoolList() {
  const { allSchools } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredSchools = allSchools;

  if (search) {
    const regex = new RegExp(toEscapedString(search), 'i');

    filteredSchools = allSchools.filter((school) => {
      return regex.test(school.name);
    });
  }

  if (!filteredSchools.length) {
    return <FilterEmptyMessage>No schools found.</FilterEmptyMessage>;
  }

  return (
    <FilterList>
      {filteredSchools.map((school) => {
        return (
          <FilterItem
            key={school.id}
            label={`${school.name} (${school.count})`}
            value={school.id}
          />
        );
      })}
    </FilterList>
  );
}
