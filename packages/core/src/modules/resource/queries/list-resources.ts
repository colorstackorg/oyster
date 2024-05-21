import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListResourcesWhere } from '@/modules/resource/resource.types';

type ListResourcesOptions<Selection> = {
  limit: number;
  page: number;
  select: Selection[];
  where: ListResourcesWhere;
};

export async function listResources<
  Selection extends SelectExpression<DB, 'resources'>,
>({ limit, page, select, where }: ListResourcesOptions<Selection>) {
  const resources = await db
    .selectFrom('resources')
    .select(select)
    .$if(!!where.search, (qb) => {
      // TODO: Add functionality to search by title, description, and tags...
      return qb;
    })
    .$if(!!where.tags.length, (qb) => {
      return qb
        .leftJoin('resourceTags', 'resourceTags.resourceId', 'resources.id')
        .where((eb) => {
          return eb.or(
            where.tags.map((tag) => {
              return eb('resourceTags.tagId', '=', tag);
            })
          );
        });
    })
    .orderBy('postedAt', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute();

  return resources;
}
