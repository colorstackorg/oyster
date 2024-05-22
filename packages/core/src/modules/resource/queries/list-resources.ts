import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListResourcesWhere } from '@/modules/resource/resource.types';

type ListResourcesOptions<Selection> = {
  limit: number;
  page: number;
  select: Selection[];
  where: ListResourcesWhere;
};

export async function listResources<
  Selection extends SelectExpression<DB, 'resources' | 'students'>,
>({ limit, page, select, where }: ListResourcesOptions<Selection>) {
  const resources = await db
    .with('a', (qb) => {
      return qb
        .selectFrom('resources')
        .select(['resources.id'])
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
        .orderBy('resources.postedAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit);
    })
    .with('b', (qb) => {
      const tagsAggregation = sql<{ id: string; name: string }[]>`
        json_agg(
          json_build_object('id', tags.id, 'name', tags.name)
          order by tags.name asc
        )
      `.as('tags');

      return qb
        .selectFrom('a')
        .leftJoin('resourceTags', 'resourceTags.resourceId', 'a.id')
        .leftJoin('tags', 'tags.id', 'resourceTags.tagId')
        .select(['a.id', tagsAggregation])
        .groupBy('a.id');
    })
    .selectFrom('b')
    .leftJoin('resources', 'resources.id', 'b.id')
    .leftJoin('students', 'students.id', 'resources.postedBy')
    .select([
      ...select,
      'b.tags',
      (eb) => {
        return eb
          .selectFrom('resourceUpvotes')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('resourceUpvotes.resourceId', '=', 'resources.id')
          .as('upvotes');
      },
      (eb) => {
        return eb
          .exists(
            eb
              .selectFrom('resourceUpvotes')
              .whereRef('resourceUpvotes.resourceId', '=', 'resources.id')
              .where('resourceUpvotes.studentId', '=', where.memberId)
          )
          .as('upvoted');
      },
    ])
    .execute();

  return resources;
}
