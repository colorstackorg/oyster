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
  const query = db
    .selectFrom('companies')
    .leftJoin('opportunities', (join) => {
      return join
        .onRef('opportunities.companyId', '=', 'companies.id')
        .on('opportunities.expiresAt', '>', new Date());
    })
    .leftJoin('workExperiences', 'workExperiences.companyId', 'companies.id')
    .leftJoin(
      'companyReviews',
      'companyReviews.workExperienceId',
      'workExperiences.id'
    )
    .where('workExperiences.deletedAt', 'is', null)
    .where((eb) => {
      // We only want to return companies that have at least one employee (past
      // or present) or opportunity.
      return eb.or([
        eb('opportunities.companyId', 'is not', null),
        eb('workExperiences.companyId', 'is not', null),
      ]);
    })
    .$if(!!where.search, (qb) => {
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
        ({ fn }) => {
          return fn<string>('round', [fn.avg('rating'), sql.lit(1)]).as(
            'averageRating'
          );
        },
        ({ fn }) => {
          return fn
            .count<string>('workExperiences.studentId')
            .distinct()
            .as('employees');
        },
        ({ fn }) => {
          return fn
            .count<string>('opportunities.id')
            .distinct()
            .as('opportunities');
        },
        ({ fn }) => {
          return fn.count<string>('companyReviews.id').distinct().as('reviews');
        },
      ])
      .groupBy('companies.id')
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
          .with('most_recently_reviewed', () => {
            return qb
              .select(({ fn }) => {
                return fn.max('companyReviews.createdAt').as('lastReviewedAt');
              })
              .orderBy('lastReviewedAt', sql`desc nulls last`);
          })
          .exhaustive();
      })
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit)
      .execute(),

    query
      .select(({ fn }) => {
        return fn.count<string>('companies.id').distinct().as('count');
      })
      .executeTakeFirstOrThrow(),
  ]);

  return {
    companies,
    totalCount: Number(count),
  };
}
