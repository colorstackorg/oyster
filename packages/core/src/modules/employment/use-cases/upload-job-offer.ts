import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { UploadJobOfferInput } from '../employment.types';

/**
 * Adds a job offer to a student's profile.
 */
export async function uploadJobOffer({
  companyId,
  studentId,
  baseSalary,
  bonus,
  compensationType,
  employmentType,
  hourlyPay,
  otherCompany,
  startDate,
  status,
  stockPerYear,
  location,
  locationCoordinates,
  locationType,
}: UploadJobOfferInput) {
  const jobOfferId = id();

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('job_offers')
      .values({
        id: id(),
        baseSalary,
        bonus,
        companyId,
        compensationType,
        employmentType,
        hourlyPay,
        otherCompany,
        startDate,
        status,
        stockPerYear,
        studentId,
        location,
        locationCoordinates,
        locationType,
      })
      .execute();
  });
}
