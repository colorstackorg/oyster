import { db } from '@oyster/db';

import { type UpvoteCompanyReviewInput } from '@/modules/employment/employment.types';

export async function undoUpvoteCompanyReview(
  id: string,
  input: UpvoteCompanyReviewInput
) {
  const result = await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('companyReviewUpvotes')
      .where('companyReviewId', '=', id)
      .where('studentId', '=', input.memberId)
      .execute();
  });

  return result;
}
