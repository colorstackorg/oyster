import { sql } from 'kysely';

import { db } from '@oyster/db';

/**
 * Searches for companies in the database based on a search string.
 *
 * The search matches against company names using PostgreSQL's ILIKE operator
 * for case-insensitive partial matching, as well as trigram (pg_trgm)
 * similarity matching. For example, searching "goog" would match "Google", and
 * searching "gogle" would also match "Google" due to trigram similarity.
 *
 * Results are additionally ranked by a "popularity" score calculated from:
 * - # of work experiences at the company
 * - # of internship offers from the company
 * - # of full-time offers from the company
 * - # of opportunities posted by the company
 *
 * This provides a weighted relevance ordering with more frequently appearing
 * companies ranked higher in the results.
 *
 * @param search - The search string to match against company names
 * @returns Array of matching companies.
 */
export async function searchCompanies(search: string) {
  const companies = await db
    .with('experienceCounts', (qb) => {
      return qb
        .selectFrom('workExperiences')
        .select(['companyId', ({ fn }) => fn.countAll().as('count')])
        .groupBy('companyId');
    })
    .with('internshipOfferCounts', (qb) => {
      return qb
        .selectFrom('internshipOffers')
        .select(['companyId', ({ fn }) => fn.countAll().as('count')])
        .groupBy('companyId');
    })
    .with('fullTimeOfferCounts', (qb) => {
      return qb
        .selectFrom('fullTimeOffers')
        .select(['companyId', ({ fn }) => fn.countAll().as('count')])
        .groupBy('companyId');
    })
    .with('opportunityCounts', (qb) => {
      return qb
        .selectFrom('opportunities')
        .select(['companyId', ({ fn }) => fn.countAll().as('count')])
        .groupBy('companyId');
    })
    .with('popularity', (qb) => {
      return qb
        .selectFrom('companies')
        .leftJoin(
          'experienceCounts',
          'experienceCounts.companyId',
          'companies.id'
        )
        .leftJoin(
          'internshipOfferCounts',
          'internshipOfferCounts.companyId',
          'companies.id'
        )
        .leftJoin(
          'fullTimeOfferCounts',
          'fullTimeOfferCounts.companyId',
          'companies.id'
        )
        .leftJoin(
          'opportunityCounts',
          'opportunityCounts.companyId',
          'companies.id'
        )
        .select([
          'companies.id',
          'companies.name',
          'companies.description',
          'companies.imageUrl',

          ({ fn }) => {
            const workExperienceCount = fn.coalesce(
              'experienceCounts.count',
              sql.lit(0)
            );

            const internshipOfferCount = fn.coalesce(
              'internshipOfferCounts.count',
              sql.lit(0)
            );

            const fullTimeOfferCount = fn.coalesce(
              'fullTimeOfferCounts.count',
              sql.lit(0)
            );

            const opportunityCount = fn.coalesce(
              'opportunityCounts.count',
              sql.lit(0)
            );

            const popularity = sql<number>`log(
              1 +
              ${workExperienceCount} * 1.0 +
              ${fullTimeOfferCount} * 0.5 +
              ${internshipOfferCount} * 0.5 +
              ${opportunityCount} * 0.25
            )
            `.as('popularity');

            return popularity;
          },

          ({ eb }) => {
            return eb
              .case()
              .when('name', 'ilike', search)
              .then(sql.lit(1.0))
              .when('name', 'ilike', `${search}%`)
              .then(sql.lit(0.95))
              .when('name', 'ilike', `%${search}%`)
              .then(sql.lit(0.9))
              .else(
                sql<number>`greatest(
                  similarity(${eb.ref('name')}, ${search}),
                  word_similarity(${eb.ref('name')}, ${search})
                )`
              )
              .end()
              .as('score');
          },
        ])
        .where((eb) => {
          return eb.or([
            eb('name', 'ilike', `%${search}%`),
            eb(sql`similarity(${eb.ref('name')}, ${search})`, '>=', 0.25),
            eb(sql`word_similarity(${eb.ref('name')}, ${search})`, '>=', 0.5),
          ]);
        });
    })
    .with('adjusted', (qb) => {
      return qb.selectFrom('popularity').select([
        'description',
        'id',
        'imageUrl',
        'name',
        'popularity',
        'score',
        ({ ref }) => {
          const field = sql<number>`${ref('score')} + 0.05 * ${ref('popularity')}`;

          return field.as('totalScore');
        },
      ]);
    })
    .selectFrom('adjusted')
    .select([
      'description',
      'id',
      'imageUrl',
      'name',
      'popularity',
      'totalScore',
    ])
    .orderBy('totalScore', 'desc')
    .orderBy('name', 'asc')
    .limit(10)
    .execute();

  return companies;
}
