import { db } from '@oyster/db';

type GetCompanyReviewOptions = {
  where: { workExperienceId: string };
};

export async function getCompanyReview({ where }: GetCompanyReviewOptions) {
  const review = await db
    .selectFrom('companyReviews')
    .select([
      'companyReviews.anonymous',
      'companyReviews.id',
      'companyReviews.rating',
      'companyReviews.recommend',
      'companyReviews.text',
    ])
    .where('companyReviews.workExperienceId', '=', where.workExperienceId)
    .executeTakeFirst();

  return review;
}
