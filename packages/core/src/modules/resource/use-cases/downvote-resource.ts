import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
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

  job('gamification.activity.completed.undo', {
    resourceId: id,
    studentId: input.memberId,
    type: 'upvote_resource',
  });

  return result;
}
