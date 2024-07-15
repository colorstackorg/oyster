import { db } from '@oyster/db';

export async function hasReviewAccesstrx(id: string) {
  const workExperienceOfStudent = await db
    .selectFrom('workExperiences')
    .select(['studentId'])
    .where('studentId', '=', id)
    .executeTakeFirstOrThrow();

  if (!workExperienceOfStudent) {
    return true;
  }

  const companyReviewsFromStudent = await db
    .selectFrom('companyReviews')
    .select(['studentId'])
    .where('studentId', '=', 'id')
    .executeTakeFirstOrThrow();

  return companyReviewsFromStudent;
}
