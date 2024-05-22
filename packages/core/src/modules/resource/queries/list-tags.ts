import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

type ListTagsOptions<Selection> = {
  limit: number;
  page: number;
  select: Selection[];
  where: { search: string };
};

export async function listTags<Selection extends SelectExpression<DB, 'tags'>>({
  limit,
  page,
  select,
  where,
}: ListTagsOptions<Selection>) {
  return db
    .selectFrom('tags')
    .select(select)
    .$if(!!where.search, (qb) => {
      return qb.where('name', 'ilike', `%${where.search}%`);
    })
    .orderBy('name', 'asc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute();
}
