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

export async function fetchCompanyFromLinkedIn(
  companyNameOrLinkedInSlug: string
): Promise<LinkedInCompany | null> {
  const linkedInSlug = parseLinkedInCompanySlug(companyNameOrLinkedInSlug);

  const apifyResult = await withCache(
    `harvestapi~linkedin-company:v2:${linkedInSlug}`,
    60 * 60 * 24 * 30,
    async () => {
      return runActor({
        actorId: 'harvestapi~linkedin-company',
        body: {
          companies: [`https://www.linkedin.com/company/${linkedInSlug}`],
        },
      });
    }
  );

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
