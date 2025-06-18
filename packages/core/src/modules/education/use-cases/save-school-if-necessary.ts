import { type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB, point } from '@oyster/db';
import { id } from '@oyster/utils';

import { withCache } from '@/infrastructure/redis';
import { reportException } from '@/member-profile.server';
import { runActor } from '@/modules/apify';
import { getMostRelevantLocation } from '@/modules/location/location';

/**
 * Saves a school in the database, if it does not already exist.
 *
 * - If the `schoolName` is not provided, this function will return `null`.
 * - If the school is found in our database, it will return the ID of the
 *   existing company.
 * - If the school is not found in our database, we will scrape the school
 *   from LinkedIn and save the school in our database. Will throw an error if
 *   the school is not found in LinkedIn.
 *
 * @param trx - Database transaction to use for the operation.
 * @param schoolName - Name of the school.
 */
export async function saveSchoolIfNecessary(
  trx: Transaction<DB>,
  schoolNameOrLinkedInId: string | null | undefined
): Promise<string | null> {
  if (!schoolNameOrLinkedInId) {
    return null;
  }

  const existingSchool = await trx
    .selectFrom('schools')
    .select('id')
    .where((eb) => {
      return eb.or([
        eb('linkedinId', '=', schoolNameOrLinkedInId),
        eb('name', 'ilike', schoolNameOrLinkedInId),
      ]);
    })
    .executeTakeFirst();

  if (existingSchool) {
    return existingSchool.id;
  }

  const [schoolFromLinkedIn] = await withCache(
    `harvestapi~linkedin-company:${schoolNameOrLinkedInId}`,
    60 * 60 * 24 * 30,
    async () => {
      return runActor({
        actorId: 'harvestapi~linkedin-company',
        body: { companies: [schoolNameOrLinkedInId] },
        schema: z.array(
          z.object({
            id: z.string(),
            locations: z
              .array(
                z.object({
                  city: z.string().optional(),
                  geographicArea: z.string().optional(),
                  line1: z.string().optional(),
                  postalCode: z.string().optional(),
                })
              )
              .min(1),
            logo: z.string().url(),
            name: z.string(),
          })
        ),
      });
    }
  );

  if (!schoolFromLinkedIn) {
    return null;
  }

  const linkedInLocation = schoolFromLinkedIn.locations[0];

  const location =
    !!linkedInLocation.line1 && !!linkedInLocation.city
      ? // If all the address components are here, we'll pass in the formatted
        // address without passing in the "type" parameter.
        await getMostRelevantLocation(
          `${linkedInLocation.line1}, ${linkedInLocation.city}, ${linkedInLocation.geographicArea}, ${linkedInLocation.postalCode}`
        )
      : // Otherwise, we'll pass in the postal code and geographic area and
        // limit the search to only postal codes.
        await getMostRelevantLocation(
          `${linkedInLocation.postalCode}, ${linkedInLocation.geographicArea}`,
          'postal_code'
        );

  if (
    !location ||
    !location.city ||
    !location.state ||
    !location.country ||
    !location.postalCode
  ) {
    reportException(
      new Error(
        `Failed to find location for school ${schoolFromLinkedIn.name}.`
      )
    );

    return null;
  }

  const { id: schoolId } = await trx
    .insertInto('schools')
    .values({
      addressCity: location.city,
      addressCountry: location.country,
      addressState: location.state,
      addressZip: location.postalCode,
      coordinates: point({ x: location.longitude, y: location.latitude }),
      logoUrl: schoolFromLinkedIn.logo,
      id: id(),
      linkedinId: schoolFromLinkedIn.id,
      name: schoolFromLinkedIn.name,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return schoolId;
}
