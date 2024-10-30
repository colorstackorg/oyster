import { sql } from 'kysely';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type UploadJobOfferInput } from '../employment.types';

export async function uploadJobOffer({
  baseSalary,
  bonus,
  bonusText,
  companyId,
  compensationType,
  employmentType,
  equityOrStockText,
  hourlyPay,
  isAccepted,
  isNegotiated,
  location,
  locationLatitude,
  locationLongitude,
  locationType,
  otherCompany,
  postedBy,
  relocation,
  relocationText,
  role,
  signOnBonus,
  slackChannelId,
  slackMessageId,
  startDate,
  stockPerYear,
  totalCompensationText,
}: UploadJobOfferInput) {
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('jobOffers')
      .values({
        baseSalary,
        bonus,
        bonusText,
        companyId,
        compensationType,
        employmentType,
        equityOrStockText,
        hourlyPay,
        id: id(),
        isAccepted,
        isNegotiated,
        location,
        locationCoordinates: sql`point(${locationLongitude}, ${locationLatitude})`,
        locationType,
        otherCompany,
        postedBy,
        relocation,
        relocationText,
        role,
        signOnBonus,
        slackChannelId,
        slackMessageId,
        startDate,
        stockPerYear,
        totalCompensationText,
      })
      .execute();
  });
}
