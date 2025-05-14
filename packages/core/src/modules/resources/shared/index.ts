import { type ExpressionBuilder, sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';

import { type DB } from '@oyster/db';

import { type AccentColor } from '@/shared/utils/color';

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
        .jsonAgg(object)
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
    .selectFrom('resourceTagAssociations')
    .leftJoin(
      'resourceTags',
      'resourceTags.id',
      'resourceTagAssociations.tagId'
    )
    .whereRef('resourceTagAssociations.resourceId', '=', 'resources.id')
    .select(({ fn, ref }) => {
      const object = jsonBuildObject({
        color: ref('resourceTags.color'),
        id: ref('resourceTags.id'),
        name: ref('resourceTags.name'),
      });

      return fn
        .jsonAgg(sql`${object} order by ${ref('resourceTags.name')} asc`)
        .filterWhere('resourceTags.id', 'is not', null)
        .$castTo<{ color: AccentColor; id: string; name: string }[]>()
        .as('tags');
    })
    .as('tags');
}
