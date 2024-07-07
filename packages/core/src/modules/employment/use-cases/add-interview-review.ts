import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { saveCompanyIfNecessary } from './save-company-if-necessary';
import { type AddInterviewReviewInput } from '../employment.types';

/**
 * If the company selected from Crunchbase did not previously exist in our
 * database, we will simultaneously save it in the same transaction as the work
 * experience.
 *
 *  * TODO: Add an interview review experience to the member's history, and emits a job to grant
 * gamification points for updating their work history.
 */

export async function addInterviewReview({
  studentId,
  interviewPosition,
  text,
  companyCrunchbaseId,
}: AddInterviewReviewInput) {
  await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(trx, companyCrunchbaseId);

    await trx
      .insertInto('interviewReviews')
      .values({
        id: id(),
        companyId,
        text,
        studentId,
        interviewPosition,
      })
      .execute();
  });
}
