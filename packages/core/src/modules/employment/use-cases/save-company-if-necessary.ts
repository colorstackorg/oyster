import { type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import { withCache } from '@/infrastructure/redis';
import {
  deleteObject,
  putObject,
  R2_PUBLIC_BUCKET_NAME,
  R2_PUBLIC_BUCKET_URL,
} from '@/infrastructure/s3';
import { runActor } from '@/modules/apify';
import { ColorStackError } from '@/shared/errors';

const Company = z.object({
  description: z.string().nullish(),
  id: z.string(),
  logo: z.string().url().optional(),
  name: z.string(),
  universalName: z.string(),
  website: z.string().url().nullish(),
});

/**
 * Saves a company in the database, if it does not already exist.
 *
 * - If the `companyName` is not provided, this function will return `null`.
 * - If the company is found in our database, it will return the ID of the
 *   existing company.
 * - If the company is not found in our database, we will scrape the company
 *   from LinkedIn and save the company in our database. Will throw an error if
 *   the company is not found in LinkedIn.
 *
 * @param trx - Database transaction to use for the operation.
 * @param companyName - Name of the company.
 */
export async function saveCompanyIfNecessary(
  trx: Transaction<DB>,
  companyNameOrLinkedInId: string | null | undefined
): Promise<string | null> {
  if (!companyNameOrLinkedInId) {
    return null;
  }

  const existingCompany = await trx
    .selectFrom('companies')
    .select('id')
    .where((eb) => {
      return eb.or([
        eb('linkedinId', '=', companyNameOrLinkedInId),
        eb('name', 'ilike', companyNameOrLinkedInId),
      ]);
    })
    .executeTakeFirst();

  if (existingCompany) {
    return existingCompany.id;
  }

  const apifyResult = await withCache(
    `harvestapi~linkedin-company:v2:${companyNameOrLinkedInId}`,
    60 * 60 * 24 * 30,
    async () => {
      return runActor({
        actorId: 'harvestapi~linkedin-company',
        body: { companies: [companyNameOrLinkedInId] },
      });
    }
  );

  const parseResult = z.array(Company).safeParse(apifyResult);

  if (!parseResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse company from Apify.')
      .withContext({ error: JSON.stringify(parseResult.error, null, 2) })
      .report();
  }

  const [companyFromLinkedIn] = parseResult.data;

  if (!companyFromLinkedIn) {
    return null;
  }

  let domain = undefined;

  if (companyFromLinkedIn.website) {
    const hostname = new URL(companyFromLinkedIn.website).hostname;

    domain = getDomainFromHostname(hostname);
  }

  const { id: companyId, logoKey: existingLogoKey } = await trx
    .insertInto('companies')
    .values({
      description: companyFromLinkedIn.description,
      domain,
      id: id(),
      linkedinId: companyFromLinkedIn.id,
      linkedinSlug: companyFromLinkedIn.universalName,
      name: companyFromLinkedIn.name,
    })
    .onConflict((oc) => {
      return oc.column('linkedinId').doUpdateSet((eb) => {
        return {
          description: eb.ref('excluded.description'),
          domain: eb.ref('excluded.domain'),
          name: eb.ref('excluded.name'),
        };
      });
    })
    .returning(['id', 'logoKey'])
    .executeTakeFirstOrThrow();

  if (companyFromLinkedIn.logo) {
    const newLogoKey = await uploadLogo(companyFromLinkedIn.logo);

    if (newLogoKey) {
      await trx
        .updateTable('companies')
        .set({
          imageUrl: `${R2_PUBLIC_BUCKET_URL}/${newLogoKey}`,
          logoKey: newLogoKey,
        })
        .where('id', '=', companyId)
        .execute();

      if (existingLogoKey) {
        await deleteObject({
          bucket: R2_PUBLIC_BUCKET_NAME,
          key: existingLogoKey,
        });
      }
    }
  }

  return companyId;
}

function getDomainFromHostname(hostname: string) {
  return hostname.split('.').slice(-2).join('.');
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

  const key = extension
    ? `companies/${id()}.${extension}`
    : `companies/${id()}`;

  await putObject({
    bucket: R2_PUBLIC_BUCKET_NAME,
    content: buffer,
    contentType: contentType || undefined,
    key,
  });

  return key;
}
