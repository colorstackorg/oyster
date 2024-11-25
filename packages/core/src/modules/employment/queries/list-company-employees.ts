import { db } from '@oyster/db';

type ListCompanyEmployeesOptions = {
  where: {
    companyId: string;
  };
};

export async function listCompanyEmployees({
  where,
}: ListCompanyEmployeesOptions) {
  const employees = await db
    .selectFrom('workExperiences')
    .leftJoin('students as employees', 'employees.id', 'studentId')
    .select([
      'employees.firstName',
      'employees.id',
      'employees.lastName',
      'employees.profilePicture',
      'workExperiences.locationCity',
      'workExperiences.locationType',
      'workExperiences.locationState',
      'workExperiences.title',
      (eb) => {
        return eb
          .case()
          .when('endDate', '<', new Date())
          .then('past' as const)
          .else('current' as const)
          .end()
          .as('status');
      },
    ])
    .distinctOn('studentId')
    .where('companyId', '=', where.companyId)
    .orderBy('studentId')
    .orderBy('endDate', 'desc')
    .orderBy('startDate', 'desc')
    .execute();

  return employees;
}
