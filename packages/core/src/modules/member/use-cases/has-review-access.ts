import { db } from '@oyster/db';

export async function hasReviewAccess(studentId: string): Promise<boolean> {
  const workExperienceOfStudent = await db
    .selectFrom('workExperiences')
    .select(['studentId'])
    .where('studentId', '=', studentId)
    .executeTakeFirst();

  if (!workExperienceOfStudent) {
    return true;
  }

  const companyReviewsFromStudent = await db
    .selectFrom('companyReviews')
    .select(['studentId'])
    .where('studentId', '=', studentId)
    .executeTakeFirst();

  return !!companyReviewsFromStudent;
}
