import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { deleteObject, putObject } from '@/infrastructure/s3';
import { type UpdateResourceInput } from '@/modules/resources/resources.types';
import { fail, type Result, success } from '@/shared/utils/core';

type UpdateResourceResult = Result<
  { id: string },
  { duplicateResourceId: string }
>;

export async function updateResource(
  resourceId: string,
  input: UpdateResourceInput
): Promise<UpdateResourceResult> {
  if (input.link) {
    const existingResource = await db
      .selectFrom('resources')
      .select('id')
      .where('link', '=', input.link)
      .where('id', '!=', resourceId)
      .executeTakeFirst();

    if (existingResource) {
      return fail({
        code: 409,
        context: { duplicateResourceId: existingResource.id },
        error: 'A resource with this link has already been added.',
      });
    }
  }

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

    const existingAttachments: string[] = [];
    const newAttachments: File[] = [];

    for (const attachment of input.attachments) {
      if (typeof attachment === 'string') {
        existingAttachments.push(attachment);
      } else {
        newAttachments.push(attachment);
      }
    }

    const previousAttachments = await trx
      .deleteFrom('resourceAttachments')
      .where('resourceId', '=', resourceId)
      .$if(!!existingAttachments.length, (qb) => {
        return qb.where('id', 'not in', existingAttachments);
      })
      .returning(['objectKey'])
      .execute();

    for (const file of newAttachments) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const attachmentId = id();
      const attachmentKey = `resources/${resourceId}/${attachmentId}`;

      await putObject({
        content: buffer,
        contentType: file.type,
        key: attachmentKey,
      });

      await trx
        .insertInto('resourceAttachments')
        .values({
          id: attachmentId,
          mimeType: file.type,
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

  return success({ id: resourceId });
}
