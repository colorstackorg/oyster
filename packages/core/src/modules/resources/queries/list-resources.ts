import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';

import {
  type ListResourcesOrderBy,
  type ListResourcesWhere,
} from '@/modules/resources/resources.types';
import {
  buildAttachmentsField,
  buildTagsField,
} from '@/modules/resources/shared';
import { type ListSearchParams } from '@/shared/types';

type ListResourcesOptions<Selection> = {
  memberId: string;
  orderBy: ListResourcesOrderBy;
  pagination: Pick<ListSearchParams, 'limit' | 'page'>;
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
    .$if(!!where.postedAfter, (qb) => {
      return qb.where('resources.postedAt', '>=', where.postedAfter!);
    })
    .$if(!!where.postedBefore, (qb) => {
      return qb.where('resources.postedAt', '<=', where.postedBefore!);
    })
    .$if(!!where.search, (qb) => {
      const { search } = where;

      return qb.where((eb) => {
        return eb.or([
          eb('title', 'ilike', `%${search}%`),
          eb(sql`word_similarity(title, ${search})`, '>=', 0.25),
          eb('description', 'ilike', `%${search}%`),
          eb(sql`word_similarity(description, ${search})`, '>=', 0.25),
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
      buildAttachmentsField,
      buildTagsField,

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
    .$if(orderBy === 'most_upvotes', (qb) => {
      // @ts-expect-error b/c we already have the "upvotes" field selected
      // above. For some reason Kysely isn't recognizing it though.
      return qb.orderBy('upvotes', 'desc');
    })
    .orderBy('resources.postedAt', 'desc')
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
