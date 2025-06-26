import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { putObject, R2_PUBLIC_BUCKET_NAME } from '@/infrastructure/s3';

/**
 * This script migrates all school and company logos from the Crunchbase and
 * LinkedIn CDN stores to our own S3 bucket. We only process logos that
 * don't already have a logo key in the database.
 *
 * It's a one-time script to migrate the logos, and it's not meant to be run
 * again.
 */
export async function migrateAllLogos() {
  await db.transaction().execute(async (trx) => {
    const [companies, schools] = await Promise.all([
      trx
        .selectFrom('companies')
        .select(['id', 'imageUrl'])
        .where('logoKey', 'is', null)
        .where('imageUrl', 'is not', null)
        .execute(),

      trx
        .selectFrom('schools')
        .select(['id', 'logoUrl'])
        .where('logoKey', 'is', null)
        .where('logoUrl', 'is not', null)
        .execute(),
    ]);

    console.log(`Found ${companies.length} companies with logos.`);
    console.log(`Found ${schools.length} schools with logos.`);

    for (const company of companies) {
      const logoKey = await uploadLogo(company.imageUrl!, 'companies');

      await trx
        .updateTable('companies')
        .set({ logoKey })
        .where('id', '=', company.id)
        .execute();
    }

    for (const school of schools) {
      const logoKey = await uploadLogo(school.logoUrl!, 'schools');

      await trx
        .updateTable('schools')
        .set({ logoKey })
        .where('id', '=', school.id)
        .execute();
    }
  });
}

/**
 * Reads a logo from a URL, uploads it to the S3 bucket, and returns the key.
 *
 * @param logo - The URL of the logo to upload.
 * @param prefix - The prefix to use for the key.
 * @returns The key of the uploaded logo.
 */
async function uploadLogo(logo: string, prefix: string) {
  const response = await fetch(logo);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = response.headers.get('content-type') || 'image/png';
  const extension = contentType.split('/')[1];

  const key = `${prefix}/${id()}.${extension}`;

  await putObject({
    bucket: R2_PUBLIC_BUCKET_NAME,
    content: buffer,
    contentType,
    key,
  });

  return key;
}
