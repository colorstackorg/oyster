import { type SelectExpression, sql } from 'kysely';
import { match } from 'ts-pattern';

import { db, type DB } from '@oyster/db';

import {
  type ListCompaniesOrderBy,
  type ListCompaniesWhere,
} from '@/modules/employment/employment.types';
import { type PaginationSearchParams } from '@/shared/types';

type ListCompaniesOptions<Selection> = {
  orderBy: ListCompaniesOrderBy;
  pagination: PaginationSearchParams;
  select: Selection[];
  where: ListCompaniesWhere;
};

export async function listCompanies<
  Selection extends SelectExpression<DB, 'companies'>,
>({ orderBy, pagination, select, where }: ListCompaniesOptions<Selection>) {
  const query = db.selectFrom('companies').$if(!!where.search, (qb) => {
    const { search } = where;

    return qb.where((eb) => {
      return eb.or([
        eb('name', 'ilike', `%${search}%`),
        eb(sql`word_similarity(${eb.ref('name')}, ${search})`, '>=', 0.5),
      ]);
    });
  });

  const [companies, { count }] = await Promise.all([
    query
      .select([
        ...select,

        (eb) => {
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
      .$if(!!where.search, (qb) => {
        // If we have a search term, we want to order by the similarity of the
        // company name to the search term.
        return qb.orderBy(sql`word_similarity(name, ${where.search})`, 'desc');
      })
      .$if(!!orderBy, (qb) => {
        return match(orderBy)
          .with('highest_rated', () => {
            // @ts-expect-error b/c we already have this field selected above.
            // But, for some reason Kysely isn't recognizing it.
            return qb.orderBy('averageRating', sql`desc nulls last`);
          })
          .with('most_employees', () => {
            // @ts-expect-error b/c we already have this field selected above.
            // But, for some reason Kysely isn't recognizing it.
            return qb.orderBy('employees', 'desc');
          })
          .with('most_reviews', () => {
            // @ts-expect-error b/c we already have this field selected above.
            // But, for some reason Kysely isn't recognizing it.
            return qb.orderBy('reviews', 'desc');
          })
          .exhaustive();
      })
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    companies,
    totalCount: Number(count),
  };
}
