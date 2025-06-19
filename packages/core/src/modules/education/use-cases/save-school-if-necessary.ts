import { type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB, point } from '@oyster/db';
import { id } from '@oyster/utils';

import { withCache } from '@/infrastructure/redis';
import { reportException } from '@/member-profile.server';
import { runActor } from '@/modules/apify';
import { getMostRelevantLocation } from '@/modules/location/location';
import { ColorStackError } from '@/shared/errors';

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

  const apifyResult = await withCache(
    `harvestapi~linkedin-company:v2:${schoolNameOrLinkedInId}`,
    60 * 60 * 24 * 30,
    async () => {
      return runActor({
        actorId: 'harvestapi~linkedin-company',
        body: { companies: [schoolNameOrLinkedInId] },
      });
    }
  );

  const parseResult = z
    .object({
      id: z.string(),
      logo: z.string().url(),
      name: z.string(),
    })
    .array()
    .safeParse(apifyResult);

  if (!parseResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse school from Apify.')
      .withContext({ error: JSON.stringify(parseResult.error, null, 2) })
      .report();
  }

  const [schoolFromLinkedIn] = parseResult.data;

  if (!schoolFromLinkedIn) {
    return null;
  }

  const location = await getMostRelevantLocation(
    schoolFromLinkedIn.name,
    'establishment'
  );

  if (!location || !location.city || !location.state || !location.country) {
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
    .onConflict((eb) => {
      return eb.column('name').doUpdateSet(({ ref }) => {
        return {
          logoUrl: ref('excluded.logoUrl'),
        };
      });
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return schoolId;
}
