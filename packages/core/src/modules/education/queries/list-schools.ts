import { sql, type SelectExpression } from 'kysely';

import { type DB } from '@oyster/db';

import { db } from '@/infrastructure/database';
import { type ListSearchParams } from '@/shared/types';

type ListSchoolsOptions<Selection> = {
  select: Selection[];
  where: Pick<ListSearchParams, 'search'>;
};

export async function listSchools<
  Selection extends SelectExpression<DB, 'schools'>,
>({ select, where }: ListSchoolsOptions<Selection>) {
  const { search } = where;

  const rows = await db
    .selectFrom('schools')
    .select(select)
    .$if(!!where.search, (qb) => {
      return qb
        .where(sql<boolean>`similarity(name, ${search}) > 0.15`)
        .where(sql<boolean>`word_similarity(name, ${search}) > 0.15`)
        .orderBy(sql`similarity(name, ${search})`, 'desc')
        .orderBy(sql`word_similarity(name, ${search})`, 'desc');
    })
    .$if(!where.search, (qb) => {
      return qb.orderBy('name', 'asc');
    })
    .limit(25)
    .execute();

  return rows;
}
