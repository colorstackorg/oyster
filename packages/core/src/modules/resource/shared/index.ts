import { type ExpressionBuilder, sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';

import { type DB } from '@oyster/db';

/**
 * When querying from the "resources" table, we often need to include the
 * attachments associated with those resources, which happens in the same SQL
 * query.
 */
export function buildAttachmentsField(eb: ExpressionBuilder<DB, 'resources'>) {
  return eb
    .selectFrom('resourceAttachments')
    .whereRef('resourceAttachments.resourceId', '=', 'resources.id')
    .select(({ fn, ref }) => {
      const object = jsonBuildObject({
        id: ref('resourceAttachments.id'),
        mimeType: ref('resourceAttachments.mimeType'),
        objectKey: ref('resourceAttachments.objectKey'),
      });

      return fn
        .jsonAgg(sql`${object}`)
        .$castTo<{ id: string; mimeType: string; objectKey: string }[]>()
        .as('attachments');
    })
    .as('attachments');
}

/**
 * When querying from the "resources" table, we often need to include the tags
 * associated with those resources, which happens in the same SQL query.
 *
 * This function helps build the tags field by querying the "resourceTags" and
 * "tags" tables and aggregating the tags into a JSON array.
 */
export function buildTagsField(eb: ExpressionBuilder<DB, 'resources'>) {
  return eb
    .selectFrom('resourceTags')
    .leftJoin('tags', 'tags.id', 'resourceTags.tagId')
    .whereRef('resourceTags.resourceId', '=', 'resources.id')
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
    .as('tags');
}
