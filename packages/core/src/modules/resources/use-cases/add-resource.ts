import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
import { putObject } from '@/infrastructure/s3';
import { type AddResourceInput } from '@/modules/resources/resources.types';

export async function addResource(input: AddResourceInput) {
  const result = await db.transaction().execute(async (trx) => {
    const resourceId = id();

    const resource = await trx
      .insertInto('resources')
      .values({
        description: input.description,
        id: resourceId,
        link: input.link,
        postedBy: input.postedBy,
        title: input.title,
        type: input.type,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    for (const tag of input.tags) {
      await trx
        .insertInto('resourceTags')
        .values({
          resourceId: resource.id,
          tagId: tag,
        })
        .execute();
    }

    for (const file of input.attachments as File[]) {
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
          resourceId: resource.id,
        })
        .execute();
    }

    return resource;
  });

  job('gamification.activity.completed', {
    resourceId: result.id,
    studentId: input.postedBy,
    type: 'post_resource',
  });

  return result;
}
