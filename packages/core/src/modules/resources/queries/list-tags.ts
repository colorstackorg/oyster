import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListSearchParams } from '@/shared/types';

type ListTagsOptions<Selection> = {
  pagination: Pick<ListSearchParams, 'limit' | 'page'>;
  select: Selection[];
  where: { ids?: string[]; search?: string };
};

export async function listTags<
  Selection extends SelectExpression<DB, 'resourceTags'>,
>({ pagination, select, where }: ListTagsOptions<Selection>) {
  return db
    .selectFrom('resourceTags')
    .select(select)
    .$if(!!where.ids, (qb) => {
      return qb.where('resourceTags.id', 'in', where.ids!);
    })
    .$if(!!where.search, (qb) => {
      return qb.where('name', 'ilike', `%${where.search}%`);
    })
    .orderBy('name', 'asc')
    .limit(pagination.limit)
    .offset((pagination.page - 1) * pagination.limit)
    .execute();
}
