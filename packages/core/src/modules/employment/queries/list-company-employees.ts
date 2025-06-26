import { sql } from 'kysely';

import { db } from '@oyster/db';

import { EmploymentType } from '@/modules/employment/employment.types';

type ListCompanyEmployeesOptions = {
  where: {
    companyId: string;
    search?: string;
  };
};

export async function listCompanyEmployees({
  where,
}: ListCompanyEmployeesOptions) {
  const query = db
    .with('experiences', (qb) => {
      // This first past is just getting all the work experiences for the
      // company and calculating the duration (in days) of each experience.
      return qb
        .selectFrom('workExperiences')
        .leftJoin('students as employees', 'employees.id', 'studentId')
        .select([
          'employees.firstName',
          'employees.id as employeeId',
          'employees.lastName',
          'employees.profilePicture',
          'workExperiences.employmentType',
          'workExperiences.endDate',
          'workExperiences.locationCity',
          'workExperiences.locationType',
          'workExperiences.locationState',
          'workExperiences.startDate',
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
          ({ fn, ref }) => {
            const endDate = fn.coalesce(
              ref('workExperiences.endDate'),
              sql`current_date`
            );

            const startDate = fn.coalesce(
              ref('workExperiences.startDate'),
              sql`current_date`
            );

            return sql<number>`${endDate} - ${startDate}`.as('durationInDays');
          },
        ])
        .where('companyId', '=', where.companyId)
        .where('workExperiences.deletedAt', 'is', null)
        .$if(!!where.search, (qb) => {
          return qb.where((eb) => {
            const fullName = sql`${eb.ref('employees.firstName')} || ' ' || ${eb.ref('employees.lastName')}`;

            const searchExpression = `%${where.search}%`;

            return eb.or([
              eb('employees.firstName', 'ilike', searchExpression),
              eb('employees.lastName', 'ilike', searchExpression),
              eb(fullName, 'ilike', searchExpression),
              eb('workExperiences.title', 'ilike', searchExpression),
            ]);
          });
        });
    })
    .with('latestExperiences', (qb) => {
      // This second part is getting the _latest_ experience for each employee.
      return qb
        .selectFrom('experiences')
        .selectAll()
        .orderBy('employeeId')
        .orderBy('endDate', 'desc')
        .orderBy('startDate', 'desc')
        .distinctOn('employeeId');
    })
    .with('totalDurations', (qb) => {
      // This third part is summing up the duration of all experiences for each
      // employee.
      return qb
        .selectFrom('experiences')
        .select([
          'employeeId',
          ({ fn, ref }) => {
            return fn.sum(ref('durationInDays')).as('totalDurationInDays');
          },
        ])
        .groupBy('employeeId');
    })
    // This final part is joining the latest experiences with the total
    // durations (which we're using to sort the employees) and selecting the
    // final fields we want to display.
    .selectFrom('latestExperiences')
    .innerJoin(
      'totalDurations',
      'totalDurations.employeeId',
      'latestExperiences.employeeId'
    )
    .select([
      'totalDurations.employeeId as id',
      'latestExperiences.firstName',
      'latestExperiences.lastName',
      'latestExperiences.locationType',
      'latestExperiences.profilePicture',
      'latestExperiences.status',
      'latestExperiences.title',
      (eb) => {
        return eb
          .case()
          .when('locationCity', 'is not', null)
          .then(
            sql`${eb.ref('locationCity')} || ', ' || ${eb.ref('locationState')}`
          )
          .else(null)
          .end()
          .as('location');
      },
    ])
    .orderBy((eb) => {
      return eb.case().when('status', '=', 'current').then(1).else(2).end();
    })
    .orderBy('totalDurations.totalDurationInDays', 'desc')
    .orderBy((eb) => {
      return eb
        .case()
        .when('employmentType', '=', EmploymentType.FULL_TIME)
        .then(1)
        .when('employmentType', '=', EmploymentType.INTERNSHIP)
        .then(2)
        .when('employmentType', '=', EmploymentType.CONTRACT)
        .then(3)
        .when('employmentType', '=', EmploymentType.PART_TIME)
        .then(4)
        .when('employmentType', '=', EmploymentType.APPRENTICESHIP)
        .then(5)
        .when('employmentType', '=', EmploymentType.FREELANCE)
        .then(6)
        .else(7)
        .end();
    });

  const employees = await query.execute();

  return employees;
}
