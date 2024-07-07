import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { saveCompanyIfNecessary } from './save-company-if-necessary';
import { type AddInterviewReviewInput } from '../employment.types';
// import { job } from '@/infrastructure/bull/use-cases/job';

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
