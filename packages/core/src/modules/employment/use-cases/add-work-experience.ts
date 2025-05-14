import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { saveCompanyIfNecessary } from './save-company-if-necessary';
import { type AddWorkExperienceInput } from '../employment.types';

/**
 * Adds a work experience to the member's history, and emits a job to grant
 * gamification points for updating their work history.
 *
 * If the company selected from Crunchbase did not previously exist in our
 * database, we will simultaneously save it in the same transaction as the work
 * experience.
 */
export async function addWorkExperience({
  companyCrunchbaseId,
  companyName,
  endDate,
  employmentType,
  id: workExperienceId,
  locationCity,
  locationState,
  locationType,
  startDate,
  studentId,
  title,
}: AddWorkExperienceInput) {
  workExperienceId ||= id();

  await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(trx, companyCrunchbaseId);

    await trx
      .insertInto('workExperiences')
      .values({
        companyId,
        companyName,
        employmentType,
        endDate,
        id: workExperienceId,
        locationCity,
        locationState,
        locationType,
        startDate,
        studentId,
        title,
      })
      .onConflict((oc) => {
        return oc.column('id').doUpdateSet({
          companyId,
          companyName,
          employmentType,
          endDate: endDate || null,
          locationCity,
          locationState,
          locationType,
          startDate,
          title,
        });
      })
      .execute();
  });
}
