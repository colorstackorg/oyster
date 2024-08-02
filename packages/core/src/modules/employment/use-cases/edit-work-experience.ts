import { db } from '@oyster/db';

import { saveCompanyIfNecessary } from './save-company-if-necessary';
import { type EditWorkExperienceInput } from '../employment.types';

/**
 * Edits an existing work experience from the member's history.
 *
 * If the company selected from Crunchbase did not previously exist in our
 * database, we will simultaneously save it in the same transaction as the work
 * experience.
 */
export async function editWorkExperience({
  companyCrunchbaseId,
  companyName,
  employmentType,
  endDate,
  id,
  locationCity,
  locationState,
  locationType,
  startDate,
  studentId,
  title,
}: EditWorkExperienceInput) {
  await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(trx, companyCrunchbaseId);

    await trx
      .updateTable('workExperiences')
      .set({
        companyId,
        companyName,
        employmentType,
        endDate: endDate || null,
        locationCity,
        locationState,
        locationType,
        startDate,
        studentId,
        title,
      })
      .where('id', '=', id)
      .execute();
  });
}
