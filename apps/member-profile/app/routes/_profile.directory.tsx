import { json, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
} from '@remix-run/react';
import { sql } from 'kysely';
import { useState } from 'react';
import { Filter, Plus } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  Button,
  Dropdown,
  IconButton,
  Pagination,
  Pill,
  ProfilePicture,
  Select,
  Text,
  useSearchParams,
} from '@oyster/core-ui';
import { Dashboard } from '@oyster/feature-ui';
import { ExtractValue, Student } from '@oyster/types';
import { toTitleCase } from '@oyster/utils';

import { CityCombobox } from '../shared/components/city-combobox';
import { CompanyCombobox } from '../shared/components/company-combobox';
import { EthnicityCombobox } from '../shared/components/ethnicity-combobox';
import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import {
  Company,
  Country,
  ListSearchParams,
  SchoolCombobox,
} from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';
import { formatName } from '../shared/utils/format.utils';

const DirectoryFilterParams = z.object({
  company: Company.shape.id.nullable().catch(null),
  ethnicity: Country.shape.code.nullable().catch(null),
  graduationYear: Student.shape.graduationYear.nullable().catch(null),
  hometown: z.string().trim().min(1).nullable().catch(null),
  hometownLatitude: z.coerce.number().nullable().catch(null),
  hometownLongitude: z.coerce.number().nullable().catch(null),
  location: z.string().trim().min(1).nullable().catch(null),
  locationLatitude: z.coerce.number().nullable().catch(null),
  locationLongitude: z.coerce.number().nullable().catch(null),
  school: z.string().min(1).nullable().catch(null),
});

const DirectoryFilterParam = DirectoryFilterParams.keyof().enum;

const DirectoryFilterKey = DirectoryFilterParams.omit({
  hometownLatitude: true,
  hometownLongitude: true,
  locationLatitude: true,
  locationLongitude: true,
}).keyof().enum;

const DirectorySearchParams = ListSearchParams.omit({ timezone: true }).merge(
  DirectoryFilterParams
);

type DirectoryFilterParam = ExtractValue<typeof DirectoryFilterParam>;
type DirectoryFilterKey = ExtractValue<typeof DirectoryFilterKey>;
type DirectorySearchParams = z.infer<typeof DirectorySearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = DirectorySearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const [filters, { members, totalCount }] = await Promise.all([
    getAppliedFilters(searchParams),
    getMembers(searchParams),
  ]);

  return json({
    filters,
    limit: searchParams.limit,
    members,
    page: searchParams.page,
    totalCount,
    url,
  });
}

async function getMembers({
  company,
  ethnicity,
  graduationYear,
  hometownLatitude,
  hometownLongitude,
  limit,
  locationLatitude,
  locationLongitude,
  page,
  school,
  search,
}: DirectorySearchParams) {
  const query = db
    .selectFrom('students')
    .$if(!!search, (query) => {
      return query.where((eb) => {
        return eb.or([
          eb('students.email', 'ilike', `%${search}%`),
          eb('students.firstName', 'ilike', `%${search}%`),
          eb('students.headline', 'ilike', `%${search}%`),
          eb('students.lastName', 'ilike', `%${search}%`),
          eb('students.preferredName', 'ilike', `%${search}%`),
          eb(sql`first_name || ' ' || last_name`, 'ilike', `%${search}%`),
        ]);
      });
    })
    .$if(!!company, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb
            .selectFrom('workExperiences')
            .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
            .whereRef('workExperiences.studentId', '=', 'students.id')
            .where('companies.crunchbaseId', '=', company)
        );
      });
    })
    .$if(!!ethnicity, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb
            .selectFrom('memberEthnicities')
            .whereRef('memberEthnicities.studentId', '=', 'students.id')
            .where('memberEthnicities.countryCode', '=', ethnicity)
        );
      });
    })
    .$if(!!graduationYear, (query) => {
      return query.where(
        'students.graduationYear',
        '=',
        graduationYear!.toString()
      );
    })
    .$if(!!hometownLatitude && !!hometownLongitude, (query) => {
      return query.where(
        sql`students.hometown_coordinates <@> point(${hometownLongitude}, ${hometownLatitude})`,
        '<=',
        25
      );
    })
    .$if(!!locationLatitude && !!locationLongitude, (query) => {
      return query.where(
        sql`students.current_location_coordinates <@> point(${locationLongitude}, ${locationLatitude})`,
        '<=',
        25
      );
    })
    .$if(!!school, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb
            .selectFrom('educations')
            .whereRef('educations.studentId', '=', 'students.id')
            .where('educations.schoolId', '=', school)
        );
      });
    })
    .where('joinedMemberDirectoryAt', 'is not', null);

  const [members, { count }] = await Promise.all([
    query
      .select([
        'students.firstName',
        'students.headline',
        'students.id',
        'students.lastName',
        'students.preferredName',
        'students.profilePicture',
      ])
      .orderBy('students.joinedMemberDirectoryAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    members,
    totalCount: Number(count),
  };
}

async function getAppliedFilters(
  searchParams: Pick<
    DirectorySearchParams,
    | 'company'
    | 'ethnicity'
    | 'graduationYear'
    | 'hometown'
    | 'location'
    | 'school'
  >
) {
  const [company, ethnicity, school] = await Promise.all([
    match(!!searchParams.company)
      .with(true, async () => {
        const row = await db
          .selectFrom('companies')
          .select(['companies.name'])
          .where('companies.crunchbaseId', '=', searchParams.company)
          .executeTakeFirst();

        return row?.name || null;
      })
      .with(false, () => null)
      .exhaustive(),

    match(!!searchParams.ethnicity)
      .with(true, async () => {
        const row = await db
          .selectFrom('countries')
          .select(['countries.demonym', 'countries.flagEmoji'])
          .where('countries.code', '=', searchParams.ethnicity)
          .executeTakeFirst();

        return row ? `${row.flagEmoji} ${row.demonym}` : null;
      })
      .with(false, () => null)
      .exhaustive(),

    match(!!searchParams.school)
      .with(true, async () => {
        const row = await db
          .selectFrom('schools')
          .select(['schools.name'])
          .where('schools.id', '=', searchParams.school)
          .executeTakeFirst();

        return row?.name || null;
      })
      .with(false, () => null)
      .exhaustive(),
  ]);

  return {
    company,
    ethnicity,
    graduationYear: searchParams.graduationYear,
    hometown: searchParams.hometown,
    location: searchParams.location,
    school,
  };
}

export default function DirectoryPage() {
  return (
    <>
      <Text variant="2xl">Directory 🗂️</Text>

      <Dashboard.Subheader>
        <Dashboard.SearchForm placeholder="Search by name or email..." />

        <div className="ml-auto flex items-center gap-2">
          <FilterDirectoryDropdown />
        </div>
      </Dashboard.Subheader>

      <div>
        <AppliedFilterGroup />
      </div>

      <MembersGrid />
      <DirectoryPagination />
      <Outlet />
    </>
  );
}

export function ErrorBoundary() {
  return <></>;
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

const DIRECTORY_FILTER_KEYS = Object.values(DirectoryFilterKey);

function FilterDirectoryDropdown() {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onClick() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      <IconButton
        backgroundColor="gray-100"
        backgroundColorOnHover="gray-200"
        icon={<Filter />}
        onClick={onClick}
        shape="square"
      />

      {open && (
        <Dropdown>
          <div className="flex min-w-[18rem] flex-col gap-2 p-2">
            <Text>Add Filter</Text>
            <FilterForm close={() => setOpen(false)} />
          </div>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

function FilterForm({ close }: { close: VoidFunction }) {
  const [filterKey, setFilterKey] = useState<DirectoryFilterKey | null>(null);

  const [searchParams] = useSearchParams(DirectorySearchParams);

  return (
    <RemixForm className="form" method="get" onSubmit={close}>
      <Select
        placeholder="Select a field..."
        onChange={(e) => {
          setFilterKey((e.currentTarget.value || null) as DirectoryFilterKey);
        }}
      >
        {DIRECTORY_FILTER_KEYS.map((key) => {
          return (
            <option key={key} disabled={!!searchParams[key]} value={key}>
              {toTitleCase(key)}
            </option>
          );
        })}
      </Select>

      {!!filterKey && (
        <Text color="gray-500" variant="sm">
          {match(filterKey)
            .with(
              'company',
              'ethnicity',
              'graduationYear',
              'school',
              () => 'is...'
            )
            .with('location', 'hometown', () => 'is within 25 miles of...')
            .exhaustive()}
        </Text>
      )}

      {match(filterKey)
        .with('company', () => {
          return <CompanyCombobox name={DirectoryFilterKey.company} />;
        })
        .with('ethnicity', () => {
          return <EthnicityCombobox name={DirectoryFilterKey.ethnicity} />;
        })
        .with('graduationYear', () => {
          const lowestYear = 2018;
          const currentYear = new Date().getFullYear();

          const years = Array.from(
            { length: currentYear + 5 - lowestYear },
            (_, i) => {
              return lowestYear + i;
            }
          ).reverse();

          return (
            <Select name={DirectoryFilterKey.graduationYear}>
              {years.map((year) => {
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </Select>
          );
        })
        .with('hometown', () => {
          return (
            <CityCombobox
              latitudeName={DirectoryFilterParam.hometownLatitude}
              longitudeName={DirectoryFilterParam.hometownLongitude}
              name={DirectoryFilterKey.hometown}
              required
            />
          );
        })
        .with('location', () => {
          return (
            <CityCombobox
              latitudeName={DirectoryFilterParam.locationLatitude}
              longitudeName={DirectoryFilterParam.locationLongitude}
              name={DirectoryFilterKey.location}
              required
            />
          );
        })
        .with('school', () => {
          return <SchoolCombobox name={DirectoryFilterKey.school} />;
        })
        .with(null, () => {
          return null;
        })
        .exhaustive()}

      {!!filterKey && (
        <Button fill size="small" type="submit">
          <Plus size={20} /> Add Filter
        </Button>
      )}

      {Object.entries(searchParams).map(([key, value]) => {
        return (
          !!value && (
            <input
              key={key}
              name={key}
              type="hidden"
              value={value.toString()}
            />
          )
        );
      })}
    </RemixForm>
  );
}

function AppliedFilterGroup() {
  const { filters, url: _url } = useLoaderData<typeof loader>();

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {Object.entries(filters)
        .filter(([_, value]) => !!value)
        .map(([key, value]) => {
          const url = new URL(_url);
          url.searchParams.delete(key);

          if (key === DirectoryFilterKey.hometown) {
            url.searchParams.delete(DirectoryFilterParam.hometownLatitude);
            url.searchParams.delete(DirectoryFilterParam.hometownLongitude);
          }

          if (key === DirectoryFilterKey.location) {
            url.searchParams.delete(DirectoryFilterParam.locationLatitude);
            url.searchParams.delete(DirectoryFilterParam.locationLongitude);
          }

          // When the origin is included, it is an absolute URL but we need it
          // to be relative so that the whole page doesn't refresh.
          const href = url.href.replace(url.origin, '');

          return (
            <li>
              <Pill color="pink-100" key={key} onCloseHref={href}>
                {toTitleCase(key)}: {value}
              </Pill>
            </li>
          );
        })}
    </ul>
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
    <ul className="@[1200px]:grid-cols-3 @[800px]:grid-cols-2 grid grid-cols-1 gap-2 overflow-scroll">
      {members.map((member) => {
        return <MemberItem key={member.id} member={member} />;
      })}
    </ul>
  );
}

type MemberInView = SerializeFrom<typeof loader>['members'][number];

function MemberItem({ member }: { member: MemberInView }) {
  return (
    <li>
      <Link
        className="grid grid-cols-[3rem,1fr] items-center gap-4 rounded-2xl p-2 hover:bg-gray-100 sm:grid-cols-[4rem,1fr]"
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
