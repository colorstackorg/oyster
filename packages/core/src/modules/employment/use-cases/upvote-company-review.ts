import { db } from '@oyster/db';

import { type UpvoteCompanyReviewInput } from '@/modules/employment/employment.types';

export async function upvoteCompanyReview(
  id: string,
  input: UpvoteCompanyReviewInput
) {
  const result = await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('companyReviewUpvotes')
      .values({
        companyReviewId: id,
        studentId: input.memberId,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();
  });

  return result;
}
