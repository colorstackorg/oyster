import { db } from '@oyster/db';

type GetInterviewReviewOptions = {
  where: { interviewReviewId: string };
};

export async function getInterviewReview({ where }: GetInterviewReviewOptions) {
  const review = await db
    .selectFrom('interviewReviews')
    .select([
      'interviewReviews.id',
      'interviewReviews.companyId',
      'interviewReviews.text',
      'interviewReviews.interviewPosition',
    ])
    .where('interviewReviews.id', '=', where.interviewReviewId)
    .executeTakeFirst();

  return review;
}
