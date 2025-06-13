import { db } from '@oyster/db';

import { saveCompanyIfNecessary } from './save-company-if-necessary';
import { type EditWorkExperienceInput } from '../employment.types';

/**
 * Edits an existing work experience from the member's history.
 *
 * If the company selected did not previously exist in our database, we will
 * simultaneously save it in the same transaction as the work experience.
 */
export async function editWorkExperience({
  companyId,
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
    companyId ||= await saveCompanyIfNecessary(trx, companyName);

    await trx
      .updateTable('workExperiences')
      .set({
        ...(companyId
          ? { companyId, companyName: null }
          : { companyId: null, companyName }),
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
