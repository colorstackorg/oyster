import { type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import { withCache } from '@/infrastructure/redis';
import { runActor } from '@/modules/apify';

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

  const [companyFromLinkedIn] = await withCache(
    `harvestapi~linkedin-company:${companyNameOrLinkedInId}`,
    60 * 60 * 24 * 30,
    async () => {
      return runActor({
        actorId: 'harvestapi~linkedin-company',
        body: { companies: [companyNameOrLinkedInId] },
        schema: z.array(
          z.object({
            description: z.string().nullish(),
            id: z.string(),
            logo: z.string().url().optional(),
            name: z.string(),
            universalName: z.string(),
            website: z.string().url().nullish(),
          })
        ),
      });
    }
  );

  if (!companyFromLinkedIn) {
    return null;
  }

  let domain = undefined;

  if (companyFromLinkedIn.website) {
    const hostname = new URL(companyFromLinkedIn.website).hostname;

    domain = getDomainFromHostname(hostname);
  }

  const { id: companyId } = await trx
    .insertInto('companies')
    .values({
      description: companyFromLinkedIn.description,
      domain,
      id: id(),
      imageUrl: companyFromLinkedIn.logo, // TODO: Should really copy into our bucket.
      linkedinId: companyFromLinkedIn.id,
      linkedinSlug: companyFromLinkedIn.universalName,
      name: companyFromLinkedIn.name,
    })
    .onConflict((oc) => {
      return oc.column('linkedinId').doUpdateSet((eb) => {
        return {
          description: eb.ref('excluded.description'),
          domain: eb.ref('excluded.domain'),
          imageUrl: eb.ref('excluded.imageUrl'),
          name: eb.ref('excluded.name'),
        };
      });
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return companyId;
}

function getDomainFromHostname(hostname: string) {
  return hostname.split('.').slice(-2).join('.');
}
