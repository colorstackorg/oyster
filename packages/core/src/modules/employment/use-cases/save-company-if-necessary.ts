import { type Transaction } from 'kysely';

import { type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import {
  deleteObject,
  putObject,
  R2_PUBLIC_BUCKET_NAME,
  R2_PUBLIC_BUCKET_URL,
} from '@/infrastructure/s3';
import {
  fetchCompanyFromLinkedIn,
  getDomainFromCompanyWebsite,
} from '@/modules/employment/use-cases/fetch-company-from-linkedin';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';

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

  const companyFromLinkedIn = await fetchCompanyFromLinkedIn(
    companyNameOrLinkedInId
  );

  if (!companyFromLinkedIn) {
    return null;
  }

  const { id: companyId, logoKey: existingLogoKey } = await trx
    .insertInto('companies')
    .values({
      description: companyFromLinkedIn.description,
      domain: companyFromLinkedIn.website
        ? getDomainFromCompanyWebsite(companyFromLinkedIn.website)
        : undefined,
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
    await setCompanyLogo({
      companyId,
      existingLogoKey,
      logoUrl: companyFromLinkedIn.logo,
      trx,
    });
  }

  return companyId;
}

type SetCompanyLogoInput = {
  companyId: string;
  existingLogoKey?: string | null;
  logoUrl: string;
  trx: Transaction<DB>;
};

async function setCompanyLogo({
  companyId,
  existingLogoKey,
  logoUrl,
  trx,
}: SetCompanyLogoInput) {
  const hasR2Credentials =
    !!R2_ACCESS_KEY_ID && !!R2_PUBLIC_BUCKET_NAME && !!R2_PUBLIC_BUCKET_URL;

  if (hasR2Credentials) {
    const newLogoKey = await uploadLogo(logoUrl);

    if (!newLogoKey) {
      return;
    }

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

    return;
  }

  await trx
    .updateTable('companies')
    .set({
      imageUrl: logoUrl,
    })
    .where('id', '=', companyId)
    .execute();
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
