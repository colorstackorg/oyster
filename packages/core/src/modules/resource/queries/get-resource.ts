import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';

type GetResourceOptions<Selection> = {
  memberId: string;
  select: Selection[];
  where: { id: string };
};

export async function getResource<
  Selection extends SelectExpression<DB, 'resources' | 'students'>,
>({ memberId, select, where }: GetResourceOptions<Selection>) {
  const resource = await db
    .with('a', (qb) => {
      const tagsAggregation = sql<{ id: string; name: string }[]>`
        json_agg(
          json_build_object('id', tags.id, 'name', tags.name)
          order by tags.name asc
        )
      `.as('tags');

      return qb
        .selectFrom('resources')
        .leftJoin('resourceTags', 'resourceTags.resourceId', 'resources.id')
        .leftJoin('tags', 'tags.id', 'resourceTags.tagId')
        .select(['resources.id', tagsAggregation])
        .groupBy('resources.id')
        .where('resources.id', '=', where.id);
    })
    .selectFrom('a')
    .leftJoin('resources', 'resources.id', 'a.id')
    .leftJoin('students', 'students.id', 'resources.postedBy')
    .select([
      ...select,
      'a.tags',
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
              .where('resourceUpvotes.studentId', '=', memberId)
          )
          .as('upvoted');
      },
    ])
    .executeTakeFirstOrThrow();

  return resource;
}
