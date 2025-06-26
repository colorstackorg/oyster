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

import { Card } from '@/shared/components/card';
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

  const currentEmployees = employees.filter((employee) => {
    return employee.status === 'current';
  });

  const pastEmployees = employees.filter((employee) => {
    return employee.status === 'past';
  });

  return json({
    currentEmployees,
    pastEmployees,
  });
}

export default function Employees() {
  return (
    <>
      <SearchForm />
      <CurrentEmployees />
      <PastEmployees />
    </>
  );
}

function CurrentEmployees() {
  const { currentEmployees } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Current Employees ({currentEmployees.length})</Card.Title>

      {currentEmployees.length ? (
        <ul>
          {currentEmployees.map((employee) => {
            return <EmployeeItem key={employee.id} employee={employee} />;
          })}
        </ul>
      ) : (
        <Text color="gray-500" variant="sm">
          No current employees found from ColorStack.
        </Text>
      )}
    </Card>
  );
}

function PastEmployees() {
  const { pastEmployees } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Past Employees ({pastEmployees.length})</Card.Title>

      {pastEmployees.length ? (
        <ul>
          {pastEmployees.map((employee) => {
            return <EmployeeItem key={employee.id} employee={employee} />;
          })}
        </ul>
      ) : (
        <Text color="gray-500" variant="sm">
          No past employees found from ColorStack.
        </Text>
      )}
    </Card>
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

type EmployeeInView = SerializeFrom<typeof loader>['currentEmployees'][number];

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
