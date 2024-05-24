import { type SelectExpression, sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';

import { db, type DB } from '@oyster/db';

import {
  type ListResourcesOrderBy,
  type ListResourcesWhere,
} from '@/modules/resource/resource.types';
import { buildTagsField } from '@/modules/resource/shared';

type ListResourcesOptions<Selection> = {
  memberId: string;
  orderBy: ListResourcesOrderBy;
  pagination: { limit: number; page: number };
  select: Selection[];
  where: ListResourcesWhere;
};

/**
 * This is the core query that powers the resource database - it allows
 * resources to be filtered by tags, a search query, and more. It can
 * be ordered by newest or by the number of upvotes. It will also populate
 * the "attachments", "upvoted", "upvotes", and "views" fields, which are all
 * derived from other tables.
 */
export async function listResources<
  Selection extends SelectExpression<DB, 'resources' | 'students'>,
>({
  memberId,
  orderBy,
  pagination,
  select,
  where,
}: ListResourcesOptions<Selection>) {
  // The base query only includes the conditions necessary to fulfill the
  // filters passed in - it does not include any of the fields that need to be
  // selected.
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
          eb(sql`word_similarity(title, ${search})`, '>=', 0.25),
        ]);
      });
    })
    .$if(!!where.tags.length, (qb) => {
      return qb.where((eb) => {
        return eb.exists((eb) => {
          return eb
            .selectFrom('resourceTags')
            .whereRef('resourceTags.resourceId', '=', 'resources.id')
            .groupBy('resources.id')
            .having(
              sql`array_agg(resource_tags.tag_id)`,
              '@>',
              sql<string[]>`${where.tags}`
            );
        });
      });
    });

  // Now that we have the filtered resources, we can count the total number
  // of resources that match the filters (for pagination).
  const countQuery = baseQuery.select([
    (eb) => eb.fn.countAll<string>().as('count'),
  ]);

  const fullQuery = baseQuery
    .leftJoin('students', 'students.id', 'resources.postedBy')
    .select([
      ...select,
      buildTagsField,

      // The "attachments" field is a JSON array of objects, each containing
      // the "mimeType" and "s3Key" of an attachment associated with the
      // resource.
      (eb) => {
        return eb
          .selectFrom('resourceAttachments')
          .whereRef('resourceAttachments.resourceId', '=', 'resources.id')
          .select(({ fn, ref }) => {
            const object = jsonBuildObject({
              mimeType: ref('resourceAttachments.mimeType'),
              s3Key: ref('resourceAttachments.s3Key'),
            });

            return fn
              .jsonAgg(sql`${object} order by ${ref('createdAt')} asc`)
              .filterWhere('s3Key', 'is not', null)
              .$castTo<{ mimeType: string; s3Key: string }[]>()
              .as('attachments');
          })
          .as('attachments');
      },

      // The "upvoted" field is a boolean indicating whether the current
      // member has upvoted the resource or not.
      (eb) => {
        return eb
          .exists((eb) => {
            return eb
              .selectFrom('resourceUpvotes')
              .whereRef('resourceUpvotes.resourceId', '=', 'resources.id')
              .where('resourceUpvotes.studentId', '=', memberId);
          })
          .as('upvoted');
      },

      // The "upvotes" field is the total number of upvotes the resource has
      // received.
      (eb) => {
        return eb
          .selectFrom('resourceUpvotes')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('resourceUpvotes.resourceId', '=', 'resources.id')
          .as('upvotes');
      },

      // The "views" field is the total number of views the resource has
      // received.
      (eb) => {
        return eb
          .selectFrom('resourceViews')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef('resourceViews.resourceId', '=', 'resources.id')
          .as('views');
      },
    ])
    .$if(orderBy === 'newest', (qb) => {
      return qb.orderBy('resources.postedAt', 'desc');
    })
    .$if(orderBy === 'most_upvotes', (qb) => {
      // @ts-expect-error b/c we already have the "upvotes" field selected
      // above. For some reason Kysely isn't recognizing it though.
      return qb.orderBy('upvotes', 'desc');
    })
    .limit(pagination.limit)
    .offset((pagination.page - 1) * pagination.limit);

  const [resources, { count }] = await Promise.all([
    fullQuery.execute(),
    countQuery.executeTakeFirstOrThrow(),
  ]);

  return {
    resources,
    totalCount: Number(count),
  };
}
