import { db } from '@oyster/db';

export async function hasReviewAccess(id: string): Promise<boolean> {
  try {
    // Check if the student has any work experiences
    const workExperienceOfStudent = await db
      .selectFrom('workExperiences')
      .select(['studentId'])
      .where('studentId', '=', id)
      .executeTakeFirst();

    // If the student has no work experience, return true
    if (!workExperienceOfStudent) {
      return true;
    }

    // Check if the student has written any reviews
    const companyReviewsFromStudent = await db
      .selectFrom('companyReviews')
      .select(['studentId'])
      .where('studentId', '=', id)
      .executeTakeFirst();

    // Return true if a review is found, otherwise false
    return !!companyReviewsFromStudent;
  } catch (error) {
    console.error('Error checking review access:', error);
    throw error;
  }
}
