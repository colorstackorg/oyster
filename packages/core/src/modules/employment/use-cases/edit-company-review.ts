import { db } from '@/infrastructure/database';
import { type EditCompanyReviewInput } from '../employment.types';

export async function editCompanyReview({
  rating,
  recommend,
  text,
  workExperienceId,
}: EditCompanyReviewInput) {
  const review = await db.transaction().execute(async (trx) => {
    return trx
      .updateTable('companyReviews')
      .set({
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
