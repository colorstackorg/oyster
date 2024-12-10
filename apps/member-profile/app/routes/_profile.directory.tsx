import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link,
  Outlet,
  useLoaderData,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Filter, Plus } from 'react-feather';
import { match } from 'ts-pattern';
import { type z } from 'zod';

import { SchoolCombobox } from '@oyster/core/education/ui';
import { CityCombobox } from '@oyster/core/location/ui';
import { listMembersInDirectory } from '@oyster/core/member-profile/server';
import {
  ListMembersInDirectoryWhere,
  ListSearchParams,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import { type ExtractValue, ISO8601Date } from '@oyster/types';
import {
  Button,
  Dashboard,
  Dropdown,
  IconButton,
  Pagination,
  Pill,
  ProfilePicture,
  Select,
  Text,
  useSearchParams,
} from '@oyster/ui';
import { run, toTitleCase } from '@oyster/utils';

import { CompanyCombobox } from '@/shared/components/company-combobox';
import { EthnicityCombobox } from '@/shared/components/ethnicity-combobox';
import { Route } from '@/shared/constants';
import { useMixpanelTracker } from '@/shared/hooks/use-mixpanel-tracker';
import { ensureUserAuthenticated } from '@/shared/session.server';
import { formatName } from '@/shared/utils/format.utils';

const DirectoryFilterKey = ListMembersInDirectoryWhere.omit({
  hometownLatitude: true,
  hometownLongitude: true,
  locationLatitude: true,
  locationLongitude: true,
  joinedDirectoryAfter: true,
  joinedDirectoryBefore: true,
  search: true,
}).keyof().enum;

type DirectoryFilterKey = ExtractValue<typeof DirectoryFilterKey>;

const DirectorySearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
})
  .merge(ListMembersInDirectoryWhere)
  .extend({ joinedDirectoryDate: ISO8601Date.optional().catch(undefined) });

type DirectorySearchParams = z.infer<typeof DirectorySearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = DirectorySearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const { limit, page, ...where } = searchParams;

  const [filters, { members, totalCount }] = await Promise.all([
    getAppliedFilters(searchParams),
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
      },
    }),
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

async function getAppliedFilters(
  searchParams: Pick<
    DirectorySearchParams,
    | 'company'
    | 'ethnicity'
    | 'graduationYear'
    | 'hometown'
    | 'joinedDirectoryDate'
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

  const result: Array<{
    name: string;
    param: string;
    value: string | number | null | undefined;
  }> = [
    { name: 'Company', param: keys.company, value: company },
    { name: 'Ethnicity', param: keys.ethnicity, value: ethnicity },
    {
      name: 'Graduation Year',
      param: keys.graduationYear,
      value: searchParams.graduationYear,
    },
    { name: 'Hometown', param: keys.hometown, value: searchParams.hometown },
    {
      name: 'Joined Directory On',
      param: 'joinedDirectoryDate',
      value: searchParams.joinedDirectoryDate
        ? dayjs(searchParams.joinedDirectoryDate)
            .tz('America/Los_Angeles', true)
            .format('M/D/YY')
        : undefined,
    },
    { name: 'Location', param: keys.location, value: searchParams.location },
    { name: 'School', param: keys.school, value: school },
  ].filter((item) => {
    return !!item.value;
  });

  return result;
}

const keys = ListMembersInDirectoryWhere.keyof().enum;

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
    <Form className="form" method="get" onSubmit={close}>
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
          return <CompanyCombobox name={keys.company} />;
        })
        .with('ethnicity', () => {
          return <EthnicityCombobox name={keys.ethnicity} />;
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
            <Select name={keys.graduationYear}>
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
              latitudeName={keys.hometownLatitude}
              longitudeName={keys.hometownLongitude}
              name={keys.hometown}
              required
            />
          );
        })
        .with('location', () => {
          return (
            <CityCombobox
              latitudeName={keys.locationLatitude}
              longitudeName={keys.locationLongitude}
              name={keys.location}
              required
            />
          );
        })
        .with('school', () => {
          return <SchoolCombobox name={keys.school} />;
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
    </Form>
  );
}

function AppliedFilterGroup() {
  const { filters, url: _url } = useLoaderData<typeof loader>();

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {filters.map(({ name, param, value }) => {
        const url = new URL(_url);

        url.searchParams.delete(param);

        if (param === keys.hometown) {
          url.searchParams.delete(keys.hometownLatitude);
          url.searchParams.delete(keys.hometownLongitude);
        }

        if (param === keys.location) {
          url.searchParams.delete(keys.locationLatitude);
          url.searchParams.delete(keys.locationLongitude);
        }

        // When the origin is included, it is an absolute URL but we need it
        // to be relative so that the whole page doesn't refresh.
        const href = url.href.replace(url.origin, '');

        return (
          <li>
            <Pill color="pink-100" key={param} onCloseHref={href}>
              {name}: {value}
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
