import { db } from '@oyster/db';

import { isApifyConfigured } from '@/modules/apify';
import { type UpdateCompanyInput } from '@/modules/employment/employment.types';
import {
  fetchCompanyFromLinkedIn,
  getDomainFromCompanyWebsite,
} from '@/modules/employment/use-cases/fetch-company-from-linkedin';
import { fail, success } from '@/shared/utils/core';

export async function updateCompany({
  domain,
  id,
  imageUrl,
  linkedinSlug,
  name,
}: UpdateCompanyInput & { imageUrl?: string }) {
  const company = await db
    .selectFrom('companies')
    .select(['id'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!company) {
    return fail({
      code: 404,
      error: 'Company not found.',
    });
  }

  let syncedImageUrl: string | undefined;
  let description: string | null | undefined;
  let linkedinId: string | undefined;
  let resolvedLinkedInSlug: string | undefined;

  if (linkedinSlug && isApifyConfigured()) {
    try {
      const companyFromLinkedIn = await fetchCompanyFromLinkedIn(linkedinSlug);

      if (!companyFromLinkedIn) {
        return fail({
          code: 404,
          error: 'Company not found on LinkedIn.',
        });
      }

      syncedImageUrl = companyFromLinkedIn.logo;
      description = companyFromLinkedIn.description;
      linkedinId = companyFromLinkedIn.id;
      resolvedLinkedInSlug = companyFromLinkedIn.universalName;
    } catch {
      return fail({
        code: 502,
        error:
          'Failed to sync from LinkedIn. Save your changes without updating the LinkedIn slug, or set APIFY_API_TOKEN.',
      });
    }
  }

  const conflictingCompany = await findCompanyWithSameLinkedIn({
    id,
    linkedinId,
    linkedinSlug: resolvedLinkedInSlug ?? linkedinSlug,
  });

  if (conflictingCompany) {
    return fail({
      code: 409,
      error: `${conflictingCompany.name} is already linked to that LinkedIn company.`,
    });
  }

  await db
    .updateTable('companies')
    .set({
      description,
      domain,
      linkedinId,
      linkedinSlug: resolvedLinkedInSlug ?? linkedinSlug,
      name,
      ...(syncedImageUrl && { imageUrl: syncedImageUrl }),
      ...(imageUrl && { imageUrl }),
    })
    .where('id', '=', id)
    .execute();

  return success({});
}

/**
 * Finds another company that already holds the LinkedIn ID or slug we're about
 * to save. Both columns are unique, so writing them without this check fails
 * with a constraint violation instead of an error we can show to the admin.
 */
async function findCompanyWithSameLinkedIn({
  id,
  linkedinId,
  linkedinSlug,
}: {
  id: string;
  linkedinId?: string | null;
  linkedinSlug?: string | null;
}) {
  if (!linkedinId && !linkedinSlug) {
    return undefined;
  }

  return db
    .selectFrom('companies')
    .select(['id', 'name'])
    .where('id', '!=', id)
    .where((eb) => {
      return eb.or([
        ...(linkedinId ? [eb('linkedinId', '=', linkedinId)] : []),
        ...(linkedinSlug ? [eb('linkedinSlug', '=', linkedinSlug)] : []),
      ]);
    })
    .executeTakeFirst();
}

export async function syncCompanyFromLinkedIn(id: string) {
  const company = await db
    .selectFrom('companies')
    .select(['id', 'linkedinSlug'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!company) {
    return fail({
      code: 404,
      error: 'Company not found.',
    });
  }

  if (!company.linkedinSlug) {
    return fail({
      code: 400,
      error: 'This company does not have a LinkedIn slug to sync from.',
    });
  }

  const companyFromLinkedIn = await fetchCompanyFromLinkedIn(
    company.linkedinSlug
  );

  if (!companyFromLinkedIn) {
    return fail({
      code: 404,
      error: 'Company not found on LinkedIn.',
    });
  }

  const conflictingCompany = await findCompanyWithSameLinkedIn({
    id,
    linkedinId: companyFromLinkedIn.id,
    linkedinSlug: companyFromLinkedIn.universalName,
  });

  if (conflictingCompany) {
    return fail({
      code: 409,
      error: `${conflictingCompany.name} is already linked to that LinkedIn company.`,
    });
  }

  await db
    .updateTable('companies')
    .set({
      description: companyFromLinkedIn.description,
      domain: companyFromLinkedIn.website
        ? getDomainFromCompanyWebsite(companyFromLinkedIn.website)
        : undefined,
      imageUrl: companyFromLinkedIn.logo,
      linkedinId: companyFromLinkedIn.id,
      linkedinSlug: companyFromLinkedIn.universalName,
      name: companyFromLinkedIn.name,
    })
    .where('id', '=', id)
    .execute();

  return success({});
}
