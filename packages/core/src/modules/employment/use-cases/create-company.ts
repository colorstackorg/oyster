import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { isApifyConfigured } from '@/modules/apify';
import { type AdminCreateCompanyInput } from '@/modules/employment/employment.types';
import {
  fetchCompanyFromLinkedIn,
  getDomainFromCompanyWebsite,
} from '@/modules/employment/use-cases/fetch-company-from-linkedin';
import { fail, type Result, success } from '@/shared/utils/core';

export async function createCompany({
  domain,
  imageUrl,
  linkedinSlug,
  name,
}: Omit<AdminCreateCompanyInput, 'resumeBookIds'>): Promise<
  Result<{ id: string }, object>
> {
  if (linkedinSlug && isApifyConfigured()) {
    try {
      return await createCompanyFromLinkedIn(linkedinSlug);
    } catch {
      if (!name || !domain) {
        return fail<{ id: string }, object>({
          code: 502,
          error:
            'Failed to fetch company from LinkedIn. Enter a name and domain manually, or try again later.',
        });
      }
    }
  }

  if (linkedinSlug && !isApifyConfigured() && (!name || !domain)) {
    return fail<{ id: string }, object>({
      code: 400,
      error:
        'Apify is not configured. Enter a company name and domain manually, or set APIFY_API_TOKEN.',
    });
  }

  if (!name || !domain) {
    return fail<{ id: string }, object>({
      code: 400,
      error: 'Company name and domain are required.',
    });
  }

  const companyId = id();

  await db
    .insertInto('companies')
    .values({
      domain,
      id: companyId,
      ...(imageUrl && { imageUrl }),
      ...(linkedinSlug && { linkedinSlug }),
      name,
    })
    .execute();

  return success<{ id: string }, object>({ id: companyId });
}

async function createCompanyFromLinkedIn(
  linkedinSlug: string
): Promise<Result<{ id: string }, object>> {
  const existingCompany = await db
    .selectFrom('companies')
    .select(['id', 'name'])
    .where((eb) => {
      return eb.or([
        eb('linkedinSlug', '=', linkedinSlug),
        eb('linkedinId', '=', linkedinSlug),
      ]);
    })
    .executeTakeFirst();

  if (existingCompany) {
    return fail<{ id: string }, object>({
      code: 409,
      error: `${existingCompany.name} already exists in the database.`,
    });
  }

  const companyFromLinkedIn = await fetchCompanyFromLinkedIn(linkedinSlug);

  if (!companyFromLinkedIn) {
    return fail<{ id: string }, object>({
      code: 404,
      error: 'Company not found on LinkedIn.',
    });
  }

  const companyId = id();

  await db
    .insertInto('companies')
    .values({
      description: companyFromLinkedIn.description,
      domain: companyFromLinkedIn.website
        ? getDomainFromCompanyWebsite(companyFromLinkedIn.website)
        : undefined,
      id: companyId,
      imageUrl: companyFromLinkedIn.logo,
      linkedinId: companyFromLinkedIn.id,
      linkedinSlug: companyFromLinkedIn.universalName,
      name: companyFromLinkedIn.name,
    })
    .execute();

  return success<{ id: string }, object>({ id: companyId });
}
