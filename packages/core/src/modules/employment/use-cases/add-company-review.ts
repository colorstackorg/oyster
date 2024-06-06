import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { type AddCompanyReviewInput } from '../employment.types';

export async function addCompanyReview({
  rating,
  recommend,
  studentId,
  text,
  workExperienceId,
}: AddCompanyReviewInput) {
  const review = await db.transaction().execute(async (trx) => {
    return trx
      .insertInto('companyReviews')
      .values({
        id: id(),
        rating,
        recommend,
        studentId,
        text,
        workExperienceId,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  });

  return review;
}
