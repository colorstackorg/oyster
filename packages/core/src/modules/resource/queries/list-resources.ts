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
          const { search } = where;

          return qb.where((eb) => {
            return eb.or([
              eb('title', 'ilike', `%${search}%`),
              eb(sql`word_similarity(title, ${search})`, '>', 0.25),
            ]);
          });
        })
        .$if(!!where.tags.length, (qb) => {
          return qb
            .leftJoin('resourceTags', 'resourceTags.resourceId', 'resources.id')
            .groupBy('resources.id')
            .having(
              sql`array_agg(resource_tags.tag_id)`,
              '@>',
              sql<string[]>`${where.tags}`
            );
        })
        .orderBy('resources.postedAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit);
    })
    .with('b', (qb) => {
      const attachmentsAggregation = sql<{ s3Key: string }[]>`
        json_agg(
          json_strip_nulls(
            json_build_object(
              's3Key', resource_attachments.s3_key
            )
          )
          order by resource_attachments.created_at asc
        )
      `.as('attachments');

      const tagsAggregation = sql<{ id: string; name: string }[]>`
        json_agg(
          json_build_object('id', tags.id, 'name', tags.name)
          order by tags.name asc
        )
      `.as('tags');

      return qb
        .selectFrom('a')
        .leftJoin(
          'resourceAttachments',
          'resourceAttachments.resourceId',
          'a.id'
        )
        .leftJoin('resourceTags', 'resourceTags.resourceId', 'a.id')
        .leftJoin('tags', 'tags.id', 'resourceTags.tagId')
        .select(['a.id', attachmentsAggregation, tagsAggregation])
        .groupBy('a.id');
    })
    .selectFrom('b')
    .leftJoin('resources', 'resources.id', 'b.id')
    .leftJoin('students', 'students.id', 'resources.postedBy')
    .select([
      ...select,
      'b.attachments',
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
    .orderBy('resources.postedAt', 'desc')
    .execute();

  return resources;
}
