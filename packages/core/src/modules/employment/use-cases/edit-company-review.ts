import { db } from '@oyster/db';

import { type EditCompanyReviewInput } from '../employment.types';

export async function editCompanyReview({
  rating,
  recommend,
  text,
  workExperienceId,
  anonymous,
}: EditCompanyReviewInput) {
  const review = await db.transaction().execute(async (trx) => {
    return trx
      .updateTable('companyReviews')
      .set({
        rating,
        recommend,
        text,
        anonymous,
      })
      .returning(['id'])
      .where('workExperienceId', '=', workExperienceId)
      .executeTakeFirstOrThrow();
  });

  return review;
}
