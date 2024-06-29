import { db } from '@oyster/db';
import { putObject } from '@oyster/infrastructure/object-storage';
import { id as generateId } from '@oyster/utils';

import { type UpdateResourceInput } from '@/modules/resource/resource.types';

export async function updateResource(id: string, input: UpdateResourceInput) {
  const result = await db.transaction().execute(async (trx) => {
    const resource = await trx
      .updateTable('resources')
      .set({
        description: input.description,
        link: input.link,
        title: input.title,
        // attachments: input.attachments
      })
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    await trx.deleteFrom('resourceTags').where('resourceId', '=', id).execute();

    for (const tag of input.tags) {
      await trx
        .insertInto('resourceTags')
        .values({
          resourceId: id,
          tagId: tag,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    }

    await trx
      .deleteFrom('resourceAttachments')
      .where('resourceId', '=', id)
      .execute();

    for (const attachment of input.attachments) {
      const arrayBuffer = await attachment.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const attachmentId = generateId();
      const attachmentKey = `resources/${id}/${attachmentId}`;

      await putObject({
        content: buffer,
        contentType: attachment.type,
        key: attachmentKey,
      });

      await trx
        .insertInto('resourceAttachments')
        .values({
          id: id,
          mimeType: attachment.type,
          resourceId: id,
          s3Key: attachmentKey,
        })
        .execute();
      // console.log("Attachments: ", attachment)
      // await trx
      //   .insertInto('resourceAttachments')
      //   .values({
      //     resourceId: id,
      //     mime_type: attachment.mime_type,
      //     resource_id: id,
      //     s3_key: attachment.s3_key,
      //   })
      //   .execute();
    }

    return resource;
  });

  return result;
}
