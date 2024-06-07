import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type GetCompanyWhere } from '@/modules/employment/employment.types';

type GetCompanyOptions<Selection> = {
  select: Selection[];
  where: GetCompanyWhere;
};

export async function getCompany<
  Selection extends SelectExpression<DB, 'companies'>,
>({ select, where }: GetCompanyOptions<Selection>) {
  const company = await db
    .selectFrom('companies')
    .select([
      ...select,

      (eb) => {
        return eb
          .selectFrom('workExperiences')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('workExperiences.companyId', '=', 'companies.id')
          .where((eb) => {
            return eb.or([
              eb('workExperiences.endDate', 'is', null),
              eb('workExperiences.endDate', '>', new Date()),
            ]);
          })
          .as('currentEmployees');
      },

      (eb) => {
        return eb
          .selectFrom('companyReviews')
          .leftJoin(
            'workExperiences',
            'workExperiences.id',
            'companyReviews.workExperienceId'
          )
          .select((eb) => {
            return eb
              .fn<string>('round', [eb.fn.avg('rating'), sql.lit(1)])
              .as('rating');
          })
          .whereRef('workExperiences.companyId', '=', 'companies.id')
          .as('averageRating');
      },

      (eb) => {
        return eb
          .selectFrom('companyReviews')
          .leftJoin(
            'workExperiences',
            'workExperiences.id',
            'companyReviews.workExperienceId'
          )
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('workExperiences.companyId', '=', 'companies.id')
          .as('reviews');
      },
    ])
    .where('companies.id', '=', where.id)
    .executeTakeFirst();

  return company;
}
