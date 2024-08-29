import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { type AddCompanyReviewInput } from '../employment.types';

export async function addCompanyReview({
  rating,
  recommend,
  studentId,
  text,
  workExperienceId,
  anonymous,
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
        anonymous,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  });

  job('gamification.activity.completed', {
    studentId,
    type: 'review_company',
    workExperienceId,
  });

  return review;
}
