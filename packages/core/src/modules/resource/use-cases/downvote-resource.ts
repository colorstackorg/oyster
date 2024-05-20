import { db } from '@oyster/db';

import { type DownvoteResourceInput } from '@/modules/resource/resource.types';

export async function downvoteResource(
  id: string,
  input: DownvoteResourceInput
) {
  const result = await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('resourceUpvotes')
      .where('resourceId', '=', id)
      .where('studentId', '=', input.memberId)
      .execute();
  });

  return result;
}
