import { db } from '@oyster/db';

import { deleteObject } from '@/infrastructure/s3';

export async function deleteResource(id: string) {
  const attachments = await db
    .selectFrom('resourceAttachments')
    .select(['objectKey'])
    .where('resourceId', '=', id)
    .execute();

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('resources').where('id', '=', id).execute();
  });

  for (const attachment of attachments) {
    await deleteObject({
      key: attachment.objectKey,
    });
  }
}
