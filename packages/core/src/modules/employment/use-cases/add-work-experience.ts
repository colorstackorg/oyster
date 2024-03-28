import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { AddWorkExperienceInput } from '../employment.types';
import { saveCompanyIfNecessary } from './save-company-if-necessary';

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

  job('work_experience.added', {
    studentId,
    workExperienceId,
  });
}
