import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, useLoaderData } from '@remix-run/react';

import { Text } from '@oyster/ui';

import { listCompanyEmployees } from '@/modules/employment/index.server';
import { EmployeeItem } from '@/routes/_profile.companies.$id';
import { type EmployeeInView } from '@/routes/_profile.companies.$id';
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

  const pastEmployees = employees.filter((employee) => {
    return employee.status === 'past';
  });

  return json({ pastEmployees });
}

export default function PastEmployees() {
  const { pastEmployees } = useLoaderData<typeof loader>();

  return (
    <Card>
      <Card.Title>Past Employees ({pastEmployees.length})</Card.Title>

      {pastEmployees.length ? (
        <ul>
          {pastEmployees.map((employee: EmployeeInView) => {
            return <EmployeeItem key={employee.id} employee={employee} />;
          })}
        </ul>
      ) : (
        <Text color="gray-500">
          There are no past employees from ColorStack.
        </Text>
      )}
    </Card>
  );
}
