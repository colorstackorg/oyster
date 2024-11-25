import { db } from '@oyster/db';

import { type EditCompanyReviewInput } from '../employment.types';

export async function editCompanyReview({
  anonymous,
  rating,
  recommend,
  text,
  workExperienceId,
}: EditCompanyReviewInput) {
  const review = await db.transaction().execute(async (trx) => {
    return trx
      .updateTable('companyReviews')
      .set({
        anonymous,
        rating,
        recommend,
        text,
      })
      .returning(['id'])
      .where('workExperienceId', '=', workExperienceId)
      .executeTakeFirstOrThrow();
  });

  return review;
}
