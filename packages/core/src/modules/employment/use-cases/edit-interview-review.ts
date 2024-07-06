import { db } from '@oyster/db';

import { type EditInterviewReviewInput } from '../employment.types';

export async function editInterviewReview({
  interviewPosition,
  text,
  interviewReviewId,
}: EditInterviewReviewInput) {
  const review = await db.transaction().execute(async (trx) => {
    return trx
      .updateTable('interviewReviews')
      .set({
        interviewPosition,
        text,
      })
      .returning(['id'])
      .where('id', '=', interviewReviewId)
      .executeTakeFirstOrThrow();
  });

  return review;
}
