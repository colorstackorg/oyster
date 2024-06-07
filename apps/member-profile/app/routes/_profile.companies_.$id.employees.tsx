import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { generatePath, Link, useLoaderData } from '@remix-run/react';

import { cx, getTextCn, ProfilePicture, Text } from '@oyster/ui';

import { listCompanyEmployees } from '@/modules/employment/index.server';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const _employees = await listCompanyEmployees({
    select: [
      'employees.firstName',
      'employees.id',
      'employees.lastName',
      'employees.profilePicture',
    ],
    where: { companyId: params.id as string },
  });

  const employees = _employees.map(({ ...employee }) => {
    return {
      ...employee,
    };
  });

  return json({
    employees,
  });
}

export default function CompanyEmployeesPage() {
  const { employees } = useLoaderData<typeof loader>();

  if (!employees.length) {
    return <Text color="gray-500">No employees found.</Text>;
  }

  return (
    <ul>
      {employees.map((employee) => {
        return <CompanyReviewItem key={employee.id} employee={employee} />;
      })}
    </ul>
  );
}

type EmployeeInView = SerializeFrom<typeof loader>['employees'][number];

function CompanyReviewItem({ employee }: { employee: EmployeeInView }) {
  const { firstName, id, lastName, profilePicture } = employee;

  return (
    <li>
      <div className="flex w-fit items-center gap-2">
        <ProfilePicture
          initials={firstName![0] + lastName![0]}
          size="48"
          src={profilePicture || undefined}
        />

        <Link
          className={cx(getTextCn({}), 'hover:underline')}
          to={generatePath(Route['/directory/:id'], { id })}
        >
          {firstName} {lastName}
        </Link>
      </div>
    </li>
  );
}
