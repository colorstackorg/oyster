import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

type ListCompanyEmployeesOptions<Selection> = {
  select: Selection[];
  where: { companyId: string };
};

export async function listCompanyEmployees<
  Selection extends SelectExpression<
    DB & { employees: DB['students'] },
    'employees'
  >,
>({ select, where }: ListCompanyEmployeesOptions<Selection>) {
  const employees = await db
    .selectFrom('workExperiences')
    .leftJoin(
      'students as employees',
      'employees.id',
      'workExperiences.studentId'
    )
    .select(select)
    .distinctOn('workExperiences.studentId')
    .where('workExperiences.companyId', '=', where.companyId)
    .execute();

  return employees;
}
