import { db } from '@oyster/db';

/**
 * Checks if a student has review access by checking if they have a work
 * experience and company review.
 *
 * @param studentId - The ID of the student to check.
 * @returns True if the student has review access, false otherwise.
 */
export async function hasReviewAccess(studentId: string): Promise<boolean> {
  const workExperience = await db
    .selectFrom('workExperiences')
    .where('studentId', '=', studentId)
    .executeTakeFirst();

  if (!workExperience) {
    return true;
  }

  const companyReview = await db
    .selectFrom('companyReviews')
    .where('studentId', '=', studentId)
    .executeTakeFirst();

  return !!companyReview;
}
