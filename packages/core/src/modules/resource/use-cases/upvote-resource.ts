import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
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

  const { postedBy } = await db
    .selectFrom('resources')
    .select(['postedBy'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  job('gamification.activity.completed', {
    resourceId: id,
    studentId: postedBy,
    type: 'get_resource_upvote',
    upvotedBy: input.memberId,
  });

  return result;
}
