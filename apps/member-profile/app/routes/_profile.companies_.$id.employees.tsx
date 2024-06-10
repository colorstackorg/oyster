import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { generatePath, Link, useLoaderData } from '@remix-run/react';

import { cx, getTextCn, ProfilePicture, Text } from '@oyster/ui';

import { LocationType } from '@/member-profile.ui';
import { listCompanyEmployees } from '@/modules/employment/index.server';
import { Card } from '@/shared/components/card';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const employees = await listCompanyEmployees({
    where: { companyId: params.id as string },
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

export default function CompanyEmployeesPage() {
  const { currentEmployees, pastEmployees } = useLoaderData<typeof loader>();

  if (!currentEmployees.length && !pastEmployees.length) {
    return <Text color="gray-500">No employees found.</Text>;
  }

  return (
    <>
      <Card>
        <Card.Title>Current Employees ({currentEmployees.length})</Card.Title>

        {currentEmployees.length ? (
          <ul>
            {currentEmployees.map((employee) => {
              return <EmployeeItem key={employee.id} employee={employee} />;
            })}
          </ul>
        ) : (
          <Text color="gray-500">
            There are no current employees from ColorStack.
          </Text>
        )}
      </Card>

      <Card>
        <Card.Title>Past Employees ({pastEmployees.length})</Card.Title>

        {pastEmployees.length ? (
          <ul>
            {pastEmployees.map((employee) => {
              return <EmployeeItem key={employee.id} employee={employee} />;
            })}
          </ul>
        ) : (
          <Text color="gray-500">
            There are no past employees from ColorStack.
          </Text>
        )}
      </Card>
    </>
  );
}

type EmployeeInView = SerializeFrom<typeof loader>['currentEmployees'][number];

function EmployeeItem({ employee }: { employee: EmployeeInView }) {
  const { firstName, id, lastName, profilePicture } = employee;

  return (
    <li className="line-clamp-1 grid grid-cols-[3rem_1fr] items-start gap-2 rounded-2xl p-2 hover:bg-gray-100">
      <ProfilePicture
        initials={firstName![0] + lastName![0]}
        size="48"
        src={profilePicture || undefined}
      />

      <div>
        <Link
          className={cx(getTextCn({}), 'hover:underline')}
          to={generatePath(Route['/directory/:id'], { id })}
        >
          {firstName} {lastName}
        </Link>

        <Text color="gray-500" variant="sm">
          {employee.title} &bull;{' '}
          {employee.locationType === LocationType.REMOTE
            ? 'Remote'
            : `${employee.locationCity}, ${employee.locationState}`}
        </Text>
      </div>
    </li>
  );
}
