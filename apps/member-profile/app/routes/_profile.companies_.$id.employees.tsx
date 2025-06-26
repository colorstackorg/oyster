import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import { useEffect, useState } from 'react';

import { listCompanyEmployees } from '@oyster/core/employment/server';
import {
  cx,
  getTextCn,
  Pill,
  ProfilePicture,
  SearchBar,
  Text,
  useDelayedValue,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { search } = Object.fromEntries(new URL(request.url).searchParams);

  const employees = await listCompanyEmployees({
    where: {
      companyId: params.id as string,
      search,
    },
  });

  let currentCount = 0;
  let pastCount = 0;

  employees.forEach(({ status }) => {
    if (status === 'current') {
      currentCount++;
    } else if (status === 'past') {
      pastCount++;
    }
  });

  return json({
    currentCount,
    employees,
    pastCount,
  });
}

export default function Employees() {
  const { currentCount, employees, pastCount } = useLoaderData<typeof loader>();

  return (
    <>
      <SearchForm />

      {employees.length ? (
        <>
          <ul className="max-h-80 overflow-auto">
            {employees.map((employee) => {
              return <EmployeeItem key={employee.id} employee={employee} />;
            })}
          </ul>

          <Text variant="xs" color="gray-500" className="ml-auto">
            Current: {currentCount} | Past: {pastCount}
          </Text>
        </>
      ) : (
        <Text color="gray-500">No employees found from ColorStack.</Text>
      )}
    </>
  );
}

function SearchForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState<string | undefined>(undefined);
  const delayedSearch = useDelayedValue(search, 250);

  useEffect(() => {
    if (delayedSearch === undefined) {
      return;
    }

    if (delayedSearch === '') {
      return setSearchParams((params) => {
        params.delete('search');

        return params;
      });
    }

    return setSearchParams((params) => {
      params.set('search', delayedSearch);

      return params;
    });
  }, [delayedSearch]);

  return (
    <SearchBar
      defaultValue={searchParams.get('search') || undefined}
      name="search"
      onChange={(e) => setSearch(e.currentTarget.value)}
      width="full"
      placeholder="Search by name or title..."
    />
  );
}

type EmployeeInView = SerializeFrom<typeof loader>['employees'][number];

function EmployeeItem({ employee }: { employee: EmployeeInView }) {
  const {
    duration,
    firstName,
    id,
    lastName,
    location,
    profilePicture,
    status,
    title,
  } = employee;

  return (
    <li className="line-clamp-1 grid grid-cols-[3rem_1fr] items-start gap-2 rounded-2xl p-2 hover:bg-gray-100">
      <ProfilePicture
        initials={firstName![0] + lastName![0]}
        size="48"
        src={profilePicture || undefined}
      />

      <div>
        <Text className="flex items-center gap-1">
          <Link
            className={cx(getTextCn({}), 'hover:underline')}
            to={generatePath(Route['/directory/:id'], { id })}
          >
            {firstName} {lastName}
          </Link>

          <Pill color={status === 'current' ? 'lime-100' : 'gray-100'}>
            {toTitleCase(status)}
          </Pill>
        </Text>

        <Text color="gray-500" variant="sm">
          {location ? (
            <>
              {title} &bull; {location}
            </>
          ) : (
            <>{title}</>
          )}
        </Text>

        <Text color="gray-500" variant="sm">
          {duration}
        </Text>
      </div>
    </li>
  );
}
