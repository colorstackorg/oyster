import { Transaction } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';

import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { getCrunchbaseOrganization } from '../queries/get-crunchbase-organization';

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

  const companyId = id();

  await trx
    .insertInto('companies')
    .values({
      crunchbaseId: newCompany.crunchbaseId,
      description: newCompany.description,
      domain: newCompany.domain,
      id: companyId,
      imageUrl: newCompany.imageUrl,
      name: newCompany.name,
      stockSymbol: newCompany.stockSymbol,
    })
    .executeTakeFirstOrThrow();

  return companyId;
}
