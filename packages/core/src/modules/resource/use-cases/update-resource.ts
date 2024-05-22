import { db } from '@oyster/db';

import { type UpdateResourceInput } from '@/modules/resource/resource.types';

export async function updateResource(id: string, input: UpdateResourceInput) {
  const result = await db.transaction().execute(async (trx) => {
    const resource = await trx
      .updateTable('resources')
      .set({
        description: input.description,
        lastUpdatedAt: new Date(),
        link: input.link,
        title: input.title,
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

    return resource;
  });

  return result;
}
