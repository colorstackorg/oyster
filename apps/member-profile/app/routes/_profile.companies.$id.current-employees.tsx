import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { Text } from '@oyster/ui';

import { listCompanyEmployees } from '@/modules/employment/index.server';
import {
  type EmployeeInView,
  EmployeeItem,
} from '@/routes/_profile.companies.$id';
import { Card } from '@/shared/components/card';

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id as string;

  const [_employees] = await Promise.all([
    listCompanyEmployees({
      where: { companyId: id },
    }),
  ]);

  const employees = _employees.map(
    ({ locationCity, locationState, ...employee }) => {
      return {
        ...employee,
        ...(locationCity &&
          locationState && {
            location: `${locationCity}, ${locationState}`,
          }),
      };
    }
  );

  const currentEmployees = employees.filter((employee) => {
    return employee.status === 'current';
  });

  return json({ currentEmployees });
}

export default function CurrentEmployees() {
  const { currentEmployees } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Current Employees ({currentEmployees.length})</Card.Title>

      {currentEmployees.length ? (
        <ul>
          {currentEmployees.map((employee: EmployeeInView) => {
            return <EmployeeItem key={employee.id} employee={employee} />;
          })}
        </ul>
      ) : (
        <Text color="gray-500">
          There are no current employees from ColorStack.
        </Text>
      )}
    </Card>
  );
}
