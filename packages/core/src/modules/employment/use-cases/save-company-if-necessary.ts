import { type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB, db } from '@oyster/db';
import { id } from '@oyster/utils';

import { runActor } from '@/modules/apify';
import { getCrunchbaseOrganization } from '../queries/get-crunchbase-organization';

const ApifyCompanyData = z.object({
  basic_info: z.object({ name: z.string(), universal_name: z.string() }),
  company_urn: z.string(),
  input_identifier: z.string(),
  media: z.object({ logo_url: z.string() }),
});

/**
 * Saves a company in the database, if it does not already exist.
 *
 * - If the `crunchbaseId` is not provided, this function will return `null`.
 * - If the company is found in our database, it will return the ID of the
 *   existing company.
 * - If the company is not found in our database, we will query from the
 *   Crunchbase API and save the company in our database. Will throw an error if
 *   the company is not found in Crunchbase.
 *
 * @param trx - Database transaction to use for the operation.
 * @param crunchbaseId - ID of the company in Crunchbase.
 */
export async function saveCompanyIfNecessary(
  trx: Transaction<DB>,
  crunchbaseId: string
): Promise<string | null> {
  if (!crunchbaseId) {
    return null;
  }

  const existingCompany = await db
    .selectFrom('companies')
    .select(['id'])
    .where('crunchbaseId', '=', crunchbaseId)
    .executeTakeFirst();

  if (existingCompany) {
    return existingCompany.id;
  }

  const newCompany = await getCrunchbaseOrganization(crunchbaseId);

  let linkedinId: string | undefined = undefined;
  let linkedinSlug: string | undefined = undefined;

  if (newCompany.linkedInUrl) {
    const dataset = await runActor({
      actorId: 'apimaestro~linkedin-company-detail',
      body: { identifier: [newCompany.linkedInUrl] },
      schema: z.array(ApifyCompanyData),
    });

    const company = dataset?.[0];

    if (company?.company_urn) {
      linkedinId = company.company_urn;
      linkedinSlug = company.basic_info.universal_name;
    }
  }

  const companyId = id();

  await trx
    .insertInto('companies')
    .values({
      crunchbaseId: newCompany.crunchbaseId,
      description: newCompany.description,
      domain: newCompany.domain,
      id: companyId,
      imageUrl: newCompany.imageUrl,
      linkedinId,
      linkedinSlug,
      name: newCompany.name,
      stockSymbol: newCompany.stockSymbol,
    })
    .executeTakeFirstOrThrow();

  return companyId;
}
