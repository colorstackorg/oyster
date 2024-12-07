import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
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
  locationCity,
  locationState,
  locationType,
  startDate,
  studentId,
  title,
}: AddWorkExperienceInput) {
  const workExperienceId = id();

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
      .execute();
  });

  job('gamification.activity.completed', {
    studentId,
    type: 'update_work_history',
  });
}
