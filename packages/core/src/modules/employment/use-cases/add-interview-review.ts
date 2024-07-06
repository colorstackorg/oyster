import { db } from '@oyster/db';
import { id } from '@oyster/utils';

// import { job } from '@/infrastructure/bull/use-cases/job';
import { type AddInterviewReviewInput } from '../employment.types';

export async function addInterviewReview({
  studentId,
  interviewPosition,
  text,
  companyId,
}: AddInterviewReviewInput) {
  const review = await db.transaction().execute(async (trx) => {
    return trx
      .insertInto('interviewReviews')
      .values({
        id: id(),
        companyId,
        text,
        studentId,
        interviewPosition,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  });

  return review;
}
