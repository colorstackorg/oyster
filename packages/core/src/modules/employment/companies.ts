// TODO: Move all company-related code here...currently most of it is still in
// the queries/use-cases directories in this module.

import { type Transaction } from 'kysely';

import { type DB } from '@oyster/db';

import { searchCrunchbaseOrganizations } from '@/modules/employment/queries/search-crunchbase-organizations';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';

/**
 * Finds the most relevant company ID based on the given name.
 *
 * If the company is already in our database, then this function will return the
 * ID of the existing company.
 *
 * Otherwise, this function will query the Crunchbase API, choose the most
 * relevant company, and save it in our database (if it's not already there).
 * Then returns the ID of the newly created company.
 *
 * @param trx - Database transaction to use for the operation.
 * @param companyName - Name of the company to find or create.
 * @returns ID of the company found or created.
 */
export async function getMostRelevantCompany(
  trx: Transaction<DB>,
  companyName: string
) {
  const companyFromDatabase = await trx
    .selectFrom('companies')
    .select('id')
    .where('name', 'ilike', companyName)
    .executeTakeFirst();

  if (companyFromDatabase) {
    return companyFromDatabase.id;
  }

  const [company] = await searchCrunchbaseOrganizations(companyName);

  if (company && areNamesSimilar(companyName, company.name)) {
    return saveCompanyIfNecessary(trx, company.crunchbaseId);
  }

  return null;
}

/**
 * Checks if two company names are similar by checking if one string is a
 * substring of the other. This does a naive comparison by removing all
 * non-alphanumeric characters and converting to lowercase.
 *
 * @param name1 - First company name.
 * @param name2 - Second company name.
 * @returns Whether the two company names are similar.
 */
function areNamesSimilar(name1: string, name2: string) {
  const normalized1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalized2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}
