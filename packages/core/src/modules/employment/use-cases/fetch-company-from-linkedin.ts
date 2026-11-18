import { z } from 'zod';

import { withCache } from '@/infrastructure/redis';
import { runActor } from '@/modules/apify';
import { parseLinkedInCompanySlug } from '@/modules/employment/employment.utils';
import { ColorStackError } from '@/shared/errors';

const LinkedInLogo = z.object({
  height: z.number().optional(),
  url: z.string().url(),
  width: z.number().optional(),
});

const LinkedInCompanyResponse = z.object({
  description: z.string().nullish(),
  id: z.string(),
  logo: z.string().url().optional(),
  logos: LinkedInLogo.array().optional(),
  name: z.string(),
  universalName: z.string(),
  website: z.string().url().nullish(),
});

const LinkedInCompany = LinkedInCompanyResponse.transform((company) => {
  return {
    description: company.description,
    id: company.id,
    logo: company.logo ?? getBestLogoUrl(company.logos),
    name: company.name,
    universalName: company.universalName,
    website: company.website,
  };
});

export type LinkedInCompany = z.infer<typeof LinkedInCompany>;

function getBestLogoUrl(logos: z.infer<typeof LinkedInLogo>[] | undefined) {
  if (!logos?.length) {
    return undefined;
  }

  return logos.reduce((best, current) => {
    return (current.width ?? 0) > (best.width ?? 0) ? current : best;
  }).url;
}

/**
 * Fetches a company from LinkedIn by its slug, numeric ID or company URL.
 *
 * @param companyNameOrLinkedInSlug - LinkedIn slug, numeric ID or company URL.
 */
export async function fetchCompanyFromLinkedIn(
  companyNameOrLinkedInSlug: string
): Promise<LinkedInCompany | null> {
  const linkedInSlug = parseLinkedInCompanySlug(companyNameOrLinkedInSlug);

  return runLinkedInCompanyActor(
    `harvestapi~linkedin-company:v2:${linkedInSlug}`,
    { companies: [`https://www.linkedin.com/company/${linkedInSlug}`] }
  );
}

/**
 * Searches LinkedIn for a company by its name (ie: "Capital One") and returns
 * the top result. Use this when we don't know the company's LinkedIn slug,
 * such as when the name was extracted from a job posting.
 *
 * @param companyName - Name of the company to search for.
 */
export async function searchCompanyOnLinkedIn(
  companyName: string
): Promise<LinkedInCompany | null> {
  const name = companyName.trim();

  return runLinkedInCompanyActor(
    `harvestapi~linkedin-company:search:v1:${name.toLowerCase()}`,
    { searches: [name] }
  );
}

async function runLinkedInCompanyActor(
  cacheKey: string,
  body: { companies: string[] } | { searches: string[] }
): Promise<LinkedInCompany | null> {
  const apifyResult = await withCache(cacheKey, 60 * 60 * 24 * 30, async () => {
    const result = await runActor({
      actorId: 'harvestapi~linkedin-company',
      body,
    });

    // We don't want to cache an empty result, otherwise a company that
    // wasn't found once would never be looked up again for 30 days.
    return Array.isArray(result) && !result.length ? null : result;
  });

  if (!apifyResult) {
    return null;
  }

  const parseResult = z.array(LinkedInCompany).safeParse(apifyResult);

  if (!parseResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse company from LinkedIn.')
      .withContext({ error: JSON.stringify(parseResult.error, null, 2) })
      .report();
  }

  const [companyFromLinkedIn] = parseResult.data;

  return companyFromLinkedIn || null;
}

export function getDomainFromCompanyWebsite(website: string) {
  const hostname = new URL(website).hostname;

  return hostname.split('.').slice(-2).join('.');
}
