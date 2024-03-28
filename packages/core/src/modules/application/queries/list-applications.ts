import dayjs from 'dayjs';
import { sql } from 'kysely';

import { ApplicationStatus } from '@oyster/types';

import { db } from '@/infrastructure/database';

type ApplicationsSearchParams = {
  limit: number;
  page: number;
  search: string;
  status: ApplicationStatus | 'all';
  timezone: string;
};

export async function listApplications({
  limit,
  page,
  search,
  status,
  timezone,
}: ApplicationsSearchParams) {
  const query = db
    .selectFrom('applications')
    .$if(!!search, (qb) => {
      return qb.where((eb) =>
        eb.or([
          eb('applications.email', 'ilike', `%${search}%`),
          eb('applications.firstName', 'ilike', `%${search}%`),
          eb('applications.lastName', 'ilike', `%${search}%`),
          eb(sql`first_name || ' ' || last_name`, 'ilike', `%${search}%`),
        ])
      );
    })
    .$if(status !== 'all', (qb) => {
      return qb.where('applications.status', '=', status);
    });

  const [rows, { count }] = await Promise.all([
    query
      .leftJoin('schools', 'schools.id', 'applications.schoolId')
      .select([
        'applications.createdAt',
        'applications.email',
        'applications.firstName',
        'applications.id',
        'applications.lastName',
        'applications.status',
        (eb) => {
          return eb.fn
            .coalesce('schools.name', 'applications.otherSchool')
            .as('school');
        },
      ])
      .orderBy('applications.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  const applications = rows.map((row) => {
    return {
      ...row,
      createdAt: dayjs(row.createdAt).tz(timezone).format('MM/DD/YY @ h:mm A'),
    };
  });

  return {
    applications,
    totalCount: Number(count),
  };
}
