import { db } from '@oyster/db';
import { id, splitArray } from '@oyster/utils';

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
  const [companies, schools] = await Promise.all([
    db
      .selectFrom('companies')
      .select(['id', 'imageUrl'])
      .where('logoKey', 'is', null)
      .where('imageUrl', 'is not', null)
      .execute(),

    db
      .selectFrom('schools')
      .select(['id', 'logoUrl'])
      .where('logoKey', 'is', null)
      .where('logoUrl', 'is not', null)
      .execute(),
  ]);

  console.log(`Found ${companies.length} companies with logos.`);
  console.log(`Found ${schools.length} schools with logos.`);

  const companyChunks = splitArray(companies, 50);
  const schoolChunks = splitArray(schools, 50);

  for (const companyChunk of companyChunks) {
    await Promise.all(
      companyChunk.map(async (company) => {
        const logoKey = await uploadLogo(company.imageUrl!, 'companies');

        await db
          .updateTable('companies')
          .set({ logoKey })
          .where('id', '=', company.id)
          .execute();
      })
    );
  }

  for (const schoolChunk of schoolChunks) {
    await Promise.all(
      schoolChunk.map(async (school) => {
        const logoKey = await uploadLogo(school.logoUrl!, 'schools');

        await db
          .updateTable('schools')
          .set({ logoKey })
          .where('id', '=', school.id)
          .execute();
      })
    );
  }

  console.log('Done!');
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

  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = response.headers.get('content-type');

  const extension = contentType?.includes('image/')
    ? contentType.split('/')[1]
    : null;

  const key = extension
    ? `${prefix}/${id()}.${extension}`
    : `${prefix}/${id()}`;

  await putObject({
    bucket: R2_PUBLIC_BUCKET_NAME,
    content: buffer,
    contentType: contentType || undefined,
    key,
  });

  return key;
}
