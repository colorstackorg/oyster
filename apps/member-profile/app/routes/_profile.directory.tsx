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
import React, { useState } from 'react';
import { BookOpen, Briefcase, Calendar, Globe, MapPin } from 'react-feather';
import { z } from 'zod';

import { listMembersInDirectory } from '@oyster/core/member-profile/server';
import {
  ListMembersInDirectoryWhere,
  ListSearchParams,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import { ISO8601Date } from '@oyster/types';
import {
  ACCENT_COLORS,
  Dashboard,
  Pagination,
  ProfilePicture,
  Text,
} from '@oyster/ui';
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
    allHometowns,
    allLocations,
    allSchools,
    { members, totalCount },
  ] = await Promise.all([
    listAllCompanies(),
    listAllEthnicities(),
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
    allHometowns,
    allLocations,
    allSchools,
    limit: searchParams.limit,
    members,
    page: searchParams.page,
    totalCount,
  });
}

async function listAllCompanies() {
  const companies = await db
    .selectFrom('companies')
    .select(['id', 'name'])
    .where((eb) => {
      return eb.exists(() => {
        return eb
          .selectFrom('workExperiences')
          .whereRef('workExperiences.companyId', '=', 'companies.id');
      });
    })
    .orderBy('name', 'asc')
    .execute();

  return companies;
}

async function listAllEthnicities() {
  const ethnicities = await db
    .selectFrom('countries')
    .select(['code', 'demonym', 'flagEmoji'])
    .orderBy('demonym', 'asc')
    .execute();

  return ethnicities;
}

async function listAllHometowns() {
  const rows = await db
    .selectFrom('students')
    .select(['hometown', 'hometownCoordinates'])
    .distinctOn('hometown')
    .where('hometown', 'is not', null)
    .where('hometownCoordinates', 'is not', null)
    .orderBy('hometown', 'asc')
    .execute();

  const hometowns = rows.map((row) => {
    const { x, y } = row.hometownCoordinates!;

    return {
      coordinates: x + ',' + y,
      name: row.hometown!,
    };
  });

  return hometowns;
}

async function listAllLocations() {
  const rows = await db
    .selectFrom('students')
    .select(['currentLocation', 'currentLocationCoordinates'])
    .distinctOn('currentLocation')
    .where('currentLocation', 'is not', null)
    .where('currentLocationCoordinates', 'is not', null)
    .orderBy('currentLocation', 'asc')
    .execute();

  const locations = rows.map((row) => {
    const { x, y } = row.currentLocationCoordinates!;

    return {
      coordinates: x + ',' + y,
      name: row.currentLocation!,
    };
  });

  return locations;
}

async function listAllSchools() {
  const companies = await db
    .selectFrom('schools')
    .select(['id', 'name'])
    .where((eb) => {
      return eb.or([
        eb.exists(() => {
          return eb
            .selectFrom('educations')
            .whereRef('educations.schoolId', '=', 'schools.id');
        }),
        eb.exists(() => {
          return eb
            .selectFrom('students')
            .whereRef('students.schoolId', '=', 'schools.id');
        }),
      ]);
    })
    .orderBy('name', 'asc')
    .execute();

  return companies;
}

export function ErrorBoundary() {
  return <></>;
}

export default function DirectoryPage() {
  return (
    <>
      <Text variant="2xl">Directory 🗂️</Text>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-[inherit]">
          <Dashboard.SearchForm placeholder="Search by name or email..." />
          <DirectoryFilterGroup />
        </div>

        <ClearFiltersButton />
      </div>

      <MembersGrid />
      <DirectoryPagination />
      <Outlet />
    </>
  );
}

function DirectoryFilterGroup() {
  const [searchParams] = useSearchParams();

  const [showAll, setShowAll] = useState(
    !!searchParams.get('ethnicity') ||
      !!searchParams.get('graduationYear') ||
      !!searchParams.get('hometown')
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SchoolFilter />
      <CompanyFilter />
      <LocationFilter />

      {showAll ? (
        <>
          <EthnicityFilter />
          <GraduationYearFilter />
          <HometownFilter />
        </>
      ) : (
        <button
          className="ml-1 text-sm hover:underline"
          onClick={() => {
            setShowAll(true);
          }}
          type="button"
        >
          Show All
        </button>
      )}
    </div>
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
    <FilterRoot>
      <FilterButton
        icon={<Briefcase />}
        popover
        selectedValues={selectedValues}
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
  const [searchParams] = useSearchParams();
  const { allCompanies } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredCompanies = allCompanies;

  if (search) {
    filteredCompanies = allCompanies.filter((company) => {
      return new RegExp(toEscapedString(search), 'i').test(company.name);
    });
  }

  if (!filteredCompanies.length) {
    return <FilterEmptyMessage>No companies found.</FilterEmptyMessage>;
  }

  const selectedCompany = searchParams.get('company');

  return (
    <ul className="overflow-auto">
      {filteredCompanies.map((company) => {
        return (
          <FilterItem
            checked={selectedCompany === company.id}
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

function EthnicityFilter() {
  const [searchParams] = useSearchParams();
  const { allEthnicities } = useLoaderData<typeof loader>();

  const ethnicity = searchParams.get('ethnicity');

  const options: FilterValue[] = allEthnicities.map((value) => {
    return {
      color: 'pink-100',
      label: value.flagEmoji + ' ' + value.demonym,
      value: value.code,
    };
  });

  const selectedValues = options.filter((value) => {
    return ethnicity === value.value;
  });

  return (
    <FilterRoot>
      <FilterButton icon={<Globe />} popover selectedValues={selectedValues}>
        Ethnicity
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <EthnicityList />
      </FilterPopover>
    </FilterRoot>
  );
}

function EthnicityList() {
  const [searchParams] = useSearchParams();
  const { allEthnicities } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredEthnicities = allEthnicities;

  if (search) {
    filteredEthnicities = allEthnicities.filter((ethnicity) => {
      return new RegExp(toEscapedString(search), 'i').test(ethnicity.demonym);
    });
  }

  if (!filteredEthnicities.length) {
    return <FilterEmptyMessage>No ethnicities found.</FilterEmptyMessage>;
  }

  const selectedEthnicity = searchParams.get('ethnicity');

  return (
    <ul className="overflow-auto">
      {filteredEthnicities.map((ethnicity) => {
        return (
          <FilterItem
            checked={selectedEthnicity === ethnicity.code}
            key={ethnicity.code}
            label={ethnicity.flagEmoji + ' ' + ethnicity.demonym}
            name="ethnicity"
            value={ethnicity.code}
          />
        );
      })}
    </ul>
  );
}

function GraduationYearFilter() {
  const [searchParams] = useSearchParams();

  const graduationYears = searchParams.getAll('graduationYear');

  const lowestYear = 2018;
  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: currentYear + 4 - lowestYear }, (_, i) => {
    return lowestYear + i;
  });

  const options: FilterValue[] = years.map((year, i) => {
    return {
      color: ACCENT_COLORS[i % ACCENT_COLORS.length],
      label: year.toString(),
      value: year.toString(),
    };
  });

  const selectedValues = options.filter((value) => {
    return graduationYears.includes(value.value);
  });

  return (
    <FilterRoot multiple>
      <FilterButton icon={<Calendar />} popover selectedValues={selectedValues}>
        Graduation Year
      </FilterButton>

      <FilterPopover>
        <ul className="overflow-auto">
          {options.reverse().map((option) => {
            return (
              <FilterItem
                checked={graduationYears.includes(option.value)}
                color={option.color}
                key={option.value}
                label={option.label}
                name="graduationYear"
                value={option.value}
              />
            );
          })}
        </ul>
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
      color: 'pink-100',
      label: value.name,
      value: value.coordinates,
    };
  });

  const selectedValues = options.filter((value) => {
    return hometown === value.value;
  });

  return (
    <FilterRoot>
      <FilterButton icon={<MapPin />} popover selectedValues={selectedValues}>
        Hometown
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <HometownList />
      </FilterPopover>
    </FilterRoot>
  );
}

function HometownList() {
  const [searchParams] = useSearchParams();
  const { allHometowns } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredHometowns = allHometowns;

  if (search) {
    filteredHometowns = allHometowns.filter((hometown) => {
      return new RegExp(toEscapedString(search), 'i').test(hometown.name);
    });
  }

  if (!filteredHometowns.length) {
    return <FilterEmptyMessage>No hometowns found.</FilterEmptyMessage>;
  }

  const appliedHometown = searchParams.get('hometown');

  return (
    <ul className="overflow-auto">
      {filteredHometowns.map((hometown) => {
        return (
          <FilterItem
            checked={hometown.coordinates === appliedHometown}
            key={hometown.coordinates}
            label={hometown.name}
            name="hometown"
            value={hometown.coordinates}
          />
        );
      })}
    </ul>
  );
}

function LocationFilter() {
  const [searchParams] = useSearchParams();
  const { allLocations } = useLoaderData<typeof loader>();

  const location = searchParams.get('location');

  const options: FilterValue[] = allLocations.map((value) => {
    return {
      color: 'pink-100',
      label: value.name,
      value: value.coordinates,
    };
  });

  const selectedValues = options.filter((value) => {
    return location === value.value;
  });

  return (
    <FilterRoot>
      <FilterButton icon={<MapPin />} popover selectedValues={selectedValues}>
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
      return new RegExp(toEscapedString(search), 'i').test(location.name);
    });
  }

  if (!filteredLocations.length) {
    return <FilterEmptyMessage>No locations found.</FilterEmptyMessage>;
  }

  const appliedLocation = searchParams.get('location');

  return (
    <ul className="overflow-auto">
      {filteredLocations.map((location) => {
        return (
          <FilterItem
            checked={location.coordinates === appliedLocation}
            key={location.coordinates}
            label={location.name}
            name="location"
            value={location.coordinates}
          />
        );
      })}
    </ul>
  );
}

function SchoolFilter() {
  const [searchParams] = useSearchParams();
  const { allSchools } = useLoaderData<typeof loader>();

  const school = searchParams.get('school');

  const options: FilterValue[] = allSchools.map((value) => {
    return {
      color: 'pink-100',
      label: value.name,
      value: value.id,
    };
  });

  const selectedValues = options.filter((value) => {
    return school === value.value;
  });

  return (
    <FilterRoot>
      <FilterButton icon={<BookOpen />} popover selectedValues={selectedValues}>
        School
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <SchoolList />
      </FilterPopover>
    </FilterRoot>
  );
}

function SchoolList() {
  const [searchParams] = useSearchParams();
  const { allSchools } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  let filteredSchools = allSchools;

  if (search) {
    filteredSchools = allSchools.filter((school) => {
      return new RegExp(toEscapedString(search), 'i').test(school.name);
    });
  }

  if (!filteredSchools.length) {
    return <FilterEmptyMessage>No schools found.</FilterEmptyMessage>;
  }

  const selectedSchool = searchParams.get('school');

  return (
    <ul className="overflow-auto">
      {filteredSchools.map((school) => {
        return (
          <FilterItem
            checked={selectedSchool === school.id}
            key={school.id}
            label={school.name}
            name="school"
            value={school.id}
          />
        );
      })}
    </ul>
  );
}
