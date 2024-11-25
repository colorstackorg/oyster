import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type GetCompanyWhere } from '@/modules/employment/employment.types';

type GetCompanyOptions<Selection> = {
  include?: ('averageRating' | 'employees' | 'opportunities' | 'reviews')[];
  select: Selection[];
  where: GetCompanyWhere;
};

export async function getCompany<
  Selection extends SelectExpression<DB, 'companies'>,
>({ include = [], select, where }: GetCompanyOptions<Selection>) {
  const company = await db
    .selectFrom('companies')
    .select(select)
    .$if(!!include.includes('averageRating'), (qb) => {
      return qb.select((eb) => {
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
      });
    })
    .$if(!!include.includes('employees'), (qb) => {
      return qb.select((eb) => {
        return eb
          .selectFrom('workExperiences')
          .select((eb) => {
            return eb.fn
              .count<string>('workExperiences.studentId')
              .distinct()
              .as('count');
          })
          .whereRef('workExperiences.companyId', '=', 'companies.id')
          .as('employees');
      });
    })
    .$if(!!include.includes('opportunities'), (qb) => {
      return qb.select((eb) => {
        return eb
          .selectFrom('opportunities')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('opportunities.companyId', '=', 'companies.id')
          .where('opportunities.expiresAt', '>', new Date())
          .as('opportunities');
      });
    })
    .$if(!!include.includes('reviews'), (qb) => {
      return qb.select((eb) => {
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
      });
    })
    .where('companies.id', '=', where.id)
    .executeTakeFirst();

  return company;
}
