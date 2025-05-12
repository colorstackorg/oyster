import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type UpvoteResourceInput } from '@/modules/resources/resources.types';

export async function upvoteResource(id: string, input: UpvoteResourceInput) {
  const result = await db.transaction().execute(async (trx) => {
    const deleteResult = await trx
      .deleteFrom('resourceUpvotes')
      .where('resourceId', '=', id)
      .where('studentId', '=', input.memberId)
      .executeTakeFirst();

    if (deleteResult.numDeletedRows) {
      return 'deleted';
    }

    await trx
      .insertInto('resourceUpvotes')
      .values({
        resourceId: id,
        studentId: input.memberId,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();

    return 'created';
  });

  const { postedBy } = await db
    .selectFrom('resources')
    .select(['postedBy'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  if (result === 'created') {
    job('gamification.activity.completed', {
      resourceId: id,
      studentId: postedBy,
      type: 'get_resource_upvote',
      upvotedBy: input.memberId,
    });
  } else {
    job('gamification.activity.completed.undo', {
      resourceId: id,
      studentId: postedBy,
      type: 'get_resource_upvote',
      upvotedBy: input.memberId,
    });
  }

  return result;
}
