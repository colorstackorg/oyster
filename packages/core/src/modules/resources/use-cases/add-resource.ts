import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
import { putObject } from '@/infrastructure/s3';
import { type AddResourceInput } from '@/modules/resources/resources.types';
import { fail, type Result, success } from '@/shared/utils/core';
import { findResourceByUrl } from '../queries/find-resource-by-url';

type AddResourceResult = {
  id: string;
};

// Extend the Result type to include the duplicateResourceId property
type ExtendedResult<T> =
  | Result<T>
  | (Result<T> & { duplicateResourceId: string });

export async function addResource(
  input: AddResourceInput
): Promise<ExtendedResult<AddResourceResult>> {
  // Check for duplicate URL if a link is provided
  if (input.link) {
    const existingResource = await findResourceByUrl(input.link);

    if (existingResource) {
      return {
        ...fail({
          code: 409,
          error: 'A resource with this link has already been added.',
        }),
        duplicateResourceId: existingResource.id,
      };
    }
  }

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

  return success(result);
}
