import { deleteObject, putObject } from '@oyster/core/object-storage';
import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type UpdateResourceInput } from '@/modules/resource/resource.types';

export async function updateResource(
  resourceId: string,
  input: UpdateResourceInput
) {
  const result = await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('resources')
      .set({
        description: input.description,
        link: input.link,
        title: input.title,
      })
      .where('id', '=', resourceId)
      .executeTakeFirstOrThrow();

    await trx
      .deleteFrom('resourceTags')
      .where('resourceId', '=', resourceId)
      .execute();

    await trx
      .insertInto('resourceTags')
      .values(
        input.tags.map((tag) => {
          return {
            resourceId,
            tagId: tag,
          };
        })
      )
      .onConflict((oc) => oc.doNothing())
      .execute();

    // If there are no attachments, we don't need delete nor add any
    // attachments, we'll just leave as is and return early.
    if (!input.attachments.length) {
      return;
    }

    const previousAttachments = await trx
      .deleteFrom('resourceAttachments')
      .where('resourceId', '=', resourceId)
      .returning(['objectKey'])
      .execute();

    for (const attachment of input.attachments) {
      const arrayBuffer = await attachment.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const attachmentId = id();
      const attachmentKey = `resources/${resourceId}/${attachmentId}`;

      await putObject({
        content: buffer,
        contentType: attachment.type,
        key: attachmentKey,
      });

      await trx
        .insertInto('resourceAttachments')
        .values({
          id: attachmentId,
          mimeType: attachment.type,
          objectKey: attachmentKey,
          resourceId,
        })
        .execute();
    }

    return {
      previousAttachments,
    };
  });

  if (result && result.previousAttachments) {
    // Though we already deleted the previous attachments in the database, we
    // still need to delete the actual objects from the cloud storage. We wait
    // to do it after the transaction is committed to ensure that the database
    // operation is successful before we delete the objects.
    for (const attachment of result.previousAttachments) {
      await deleteObject({
        key: attachment.objectKey,
      });
    }
  }
}
