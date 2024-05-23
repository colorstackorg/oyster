import { type SelectExpression, sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';

import { db, type DB } from '@oyster/db';

import {
  type ListResourcesOrderBy,
  type ListResourcesWhere,
} from '@/modules/resource/resource.types';

type ListResourcesOptions<Selection> = {
  limit: number;
  memberId: string;
  orderBy: ListResourcesOrderBy;
  page: number;
  select: Selection[];
  where: ListResourcesWhere;
};

export async function listResources<
  Selection extends SelectExpression<DB, 'resources' | 'students'>,
>({
  limit,
  memberId,
  orderBy,
  page,
  select,
  where,
}: ListResourcesOptions<Selection>) {
  const baseQuery = db
    .selectFrom('resources')
    .$if(!!where.id, (qb) => {
      return qb.where('resources.id', '=', where.id!);
    })
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
    });

  const countQuery = baseQuery.select((eb) =>
    eb.fn.countAll<string>().as('count')
  );

  const fullQuery = baseQuery
    .leftJoin('students', 'students.id', 'resources.postedBy')
    .select([
      ...select,
      (eb) => {
        return eb
          .selectFrom('resourceAttachments')
          .whereRef('resourceAttachments.resourceId', '=', 'resources.id')
          .select(({ fn, ref }) => {
            const object = jsonBuildObject({
              s3Key: ref('resourceAttachments.s3Key'),
            });

            return fn
              .coalesce(
                fn
                  .jsonAgg(sql`${object} order by ${ref('createdAt')} asc`)
                  .filterWhere('s3Key', 'is not', null),
                sql`'[]'`
              )
              .$castTo<{ s3Key: string }[]>()
              .as('attachments');
          })
          .as('attachments');
      },
      (eb) => {
        return eb
          .selectFrom('resourceTags')
          .leftJoin('tags', 'tags.id', 'resourceTags.tagId')
          .select(({ fn, ref }) => {
            const object = jsonBuildObject({
              id: ref('tags.id'),
              name: ref('tags.name'),
            });

            return fn
              .jsonAgg(sql`${object} order by ${ref('tags.name')} asc`)
              .filterWhere('tags.id', 'is not', null)
              .$castTo<{ id: string; name: string }[]>()
              .as('tags');
          })
          .whereRef('resourceTags.resourceId', '=', 'resources.id')
          .as('tags');
      },
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
    .$if(orderBy === 'newest', (qb) => {
      return qb.orderBy('resources.postedAt', 'desc');
    })
    .$if(orderBy === 'most_upvotes', (qb) => {
      return qb
        .select([
          (eb) => {
            return eb
              .selectFrom('resourceUpvotes')
              .select(eb.fn.countAll<string>().as('count'))
              .whereRef('resourceUpvotes.resourceId', '=', 'resources.id')
              .as('upvotes');
          },
        ])
        .orderBy('upvotes', 'desc');
    })
    .limit(limit)
    .offset((page - 1) * limit);

  const [resources, { count }] = await Promise.all([
    fullQuery.execute(),
    countQuery.executeTakeFirstOrThrow(),
  ]);

  return {
    resources,
    totalCount: Number(count),
  };
}
