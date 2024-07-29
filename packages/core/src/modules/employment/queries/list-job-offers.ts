import { sql } from 'kysely';

import { db } from '@/infrastructure/database';
import { type ListJobOffersWhere } from '../employment.types';

type ListJobOffersOptions = {
  limit: number;
  page: number;
  where: ListJobOffersWhere;
};

export async function listJobOffers({
  limit,
  page,
  where,
}: ListJobOffersOptions) {
  const query = db
    .selectFrom('jobOffers')
    .$if(!!where.company, (query) => {
      return query.where('companyId', '=', where.company);
    })
    .$if(!!where.employmentType, (query) => {
      return query.where('employmentType', '=', where.employmentType);
    })
    .$if(!!where.locationLatitude && !!where.locationLongitude, (query) => {
      return query.where(
        sql`location_coordinates <@> point(${where.locationLongitude}, ${where.locationLatitude})`,
        '<=',
        25
      );
    })
    .$if(!!where.status, (query) => {
      return query.where('status', '=', where.status);
    });

  const [jobOffers, { count }] = await Promise.all([
    query
      .select(['jobOffers.id'])
      .orderBy('jobOffers.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    jobOffers,
    totalCount: Number(count),
  };
}
