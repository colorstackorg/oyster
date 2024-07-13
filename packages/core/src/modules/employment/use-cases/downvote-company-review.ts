import { db } from '@oyster/db';

import { type DownvoteCompanyReviewInput } from '@/modules/employment/company.types';

export async function downvoteCompanyReview(
  id: string,
  input: DownvoteCompanyReviewInput
) {
  const result = await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('companyReviewsUpvotes')
      .where('companyReviewId', '=', id)
      .where('studentId', '=', input.memberId)
      .execute();
  });

  return result;
}
