import type { SelectExpression } from 'kysely';
import type { DB } from 'kysely-codegen/dist/db';

import { db } from '@/infrastructure/database';

type JobOffersFilters = Partial<{
  companyId: string;
  employmentType: string;
  limit: number;
  location: string;
  page: number;
  status: string;
}>;

export async function listJobOffers<
  Selection extends SelectExpression<DB, 'jobOffers'>
>({
  limit = 100,
  page = 1,
  ...filters
}: Partial<JobOffersFilters & { limit: number; page: number }>, selections: Selection[]) {
  const query = db.selectFrom('jobOffers').where((qb) => {
    if (filters.status) {
      qb = qb.where('status', '=', filters.status);
    }
    if (filters.companyId) {
      qb = qb.where('companyId', '=', filters.companyId);
    }
    if (filters.employmentType) {
      qb = qb.where('employmentType', '=', filters.employmentType);
    }
    if (filters.location) {
      qb = qb.where('location', '=', filters.location);
    }
    return qb;
  });
  
  const [jobOffers, countResult] = await Promise.all([
    query
      .select(selections)
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    jobOffers,
    totalJobOffers: parseInt(countResult.count, 10),
  };
}
