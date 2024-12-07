import { db } from '@oyster/db';

import { deleteObject } from '@/modules/object-storage';

export async function deleteResource(id: string) {
  const result = await db.transaction().execute(async (trx) => {
    const attachments = await trx
      .selectFrom('resourceAttachments')
      .select(['objectKey'])
      .where('resourceId', '=', id)
      .execute();

    await trx.deleteFrom('resources').where('id', '=', id).execute();

    return attachments;
  });

  if (result.length > 0) {
    for (const attachment of result) {
      await deleteObject({
        key: attachment.objectKey,
      });
    }
  }
}
