import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type AddResourceInput } from '@/modules/resource/resource.types';

export async function addResource(input: AddResourceInput) {
  const result = await db.transaction().execute(async (trx) => {
    const resource = await trx
      .insertInto('resources')
      .values({
        description: input.description,
        id: id(),
        link: input.link,
        postedBy: input.postedBy,
        title: input.title,
        type: input.type,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    for (const tag in input.tags) {
      await trx
        .insertInto('resourceTags')
        .values({
          resourceId: resource.id,
          tagId: tag,
        })
        .execute();
    }

    return resource;
  });

  return result;
}
