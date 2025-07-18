import { type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB, point } from '@oyster/db';
import { id } from '@oyster/utils';

import { withCache } from '@/infrastructure/redis';
import {
  deleteObject,
  putObject,
  R2_PUBLIC_BUCKET_NAME,
  R2_PUBLIC_BUCKET_URL,
} from '@/infrastructure/s3';
import { reportException } from '@/member-profile.server';
import { runActor } from '@/modules/apify';
import { getMostRelevantLocation } from '@/modules/location/location';
import { ColorStackError } from '@/shared/errors';

const Location = z.object({
  parsed: z.object({ text: z.string().nullish() }).nullish(),
});

const School = z.object({
  id: z.string(),
  locations: Location.array().nullish(),
  logo: z.string().url().nullish(),
  name: z.string(),
});

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

  const parseResult = z.array(School).safeParse(apifyResult);

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

  let location = await getMostRelevantLocation(
    schoolFromLinkedIn.name,
    'establishment'
  );

  if (!location && schoolFromLinkedIn.locations?.[0]?.parsed?.text) {
    location = await getMostRelevantLocation(
      schoolFromLinkedIn.locations[0].parsed.text
    );
  }

  if (!location || !location.city || !location.state || !location.country) {
    reportException(
      new Error(
        `Failed to find location for school ${schoolFromLinkedIn.name}.`
      )
    );

    return null;
  }

  const { id: schoolId, logoKey: existingLogoKey } = await trx
    .insertInto('schools')
    .values({
      addressCity: location.city,
      addressCountry: location.country,
      addressState: location.state,
      addressZip: location.postalCode,
      coordinates: point({ x: location.longitude, y: location.latitude }),
      id: id(),
      linkedinId: schoolFromLinkedIn.id,
      name: schoolFromLinkedIn.name,
    })
    .onConflict((oc) => {
      return oc.column('name').doUpdateSet({
        name: schoolFromLinkedIn.name,
      });
    })
    .returning(['id', 'logoKey'])
    .executeTakeFirstOrThrow();

  if (schoolFromLinkedIn.logo) {
    const newLogoKey = await uploadLogo(schoolFromLinkedIn.logo);

    if (newLogoKey) {
      await trx
        .updateTable('schools')
        .set({
          logoKey: newLogoKey,
          logoUrl: `${R2_PUBLIC_BUCKET_URL}/${newLogoKey}`,
        })
        .where('id', '=', schoolId)
        .execute();

      if (existingLogoKey) {
        await deleteObject({
          bucket: R2_PUBLIC_BUCKET_NAME,
          key: existingLogoKey,
        });
      }
    }
  }

  return schoolId;
}

/**
 * Fetches the logo from the given URL, uploads it to S3, and returns the key.
 *
 * @param url - The URL of the logo to upload.
 */
async function uploadLogo(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = response.headers.get('content-type');

  const extension = contentType?.includes('image/')
    ? contentType.split('/')[1]
    : null;

  const key = extension ? `schools/${id()}.${extension}` : `schools/${id()}`;

  await putObject({
    bucket: R2_PUBLIC_BUCKET_NAME,
    content: buffer,
    contentType: contentType || undefined,
    key,
  });

  return key;
}
