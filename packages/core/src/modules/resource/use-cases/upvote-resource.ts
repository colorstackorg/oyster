import { db } from '@oyster/db';

import { type UpvoteResourceInput } from '@/modules/resource/resource.types';

export async function upvoteResource(id: string, input: UpvoteResourceInput) {
  const result = await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('resourceUpvotes')
      .values({
        resourceId: id,
        studentId: input.memberId,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();
  });

  return result;
}
