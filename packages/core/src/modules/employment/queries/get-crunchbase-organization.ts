import { z } from 'zod';

import { BaseCompany } from '../employment.types';
import {
  crunchbaseRateLimiter,
  getCrunchbaseKey,
  getCrunchbasePathname,
} from '../shared/crunchbase.utils';

type GetCrunchbaseOrganizationData = {
  cards: {
    fields: {
      image_url: string;
      identifier: {
        uuid: string;
        value: string;
      };
      linkedin?: { value?: string };
      listed_stock_symbol: string;
      short_description: string;
      website_url: string;
    };
  };
};

/**
 * Returns the organization from the Crunchbase API. This function validates
 * and formats the data into a partial `Company` object (our domain), including
 * domain validation.
 *
 * @param id - ID of the Crunchbase organization to get.
 *
 * @throws `Error` if the `CRUNCHBASE_BASIC_API_KEY` variable is missing.
 * @throws `Error` if the Crunchbase API request fails.
 * @throws `Error` if the Crunchbase organization data is invalid.
 *
 * @see https://data.crunchbase.com/docs/examples-entity-lookup-api
 */
export async function getCrunchbaseOrganization(id: string) {
  const key = getCrunchbaseKey();

  const pathname = getCrunchbasePathname(`/entities/organizations/${id}`);
  const url = new URL(pathname);

  url.searchParams.set('card_ids', 'fields');
  url.searchParams.set('user_key', key);

  await crunchbaseRateLimiter.process();

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch organization from the Crunchbase API.');
  }

  // TODO: Should actually validate this data in the future...
  const data: GetCrunchbaseOrganizationData = await response.json();

  let domain: string | undefined = undefined;

  const { fields } = data.cards;
  let { website_url } = fields;

  if (website_url) {
    // This is really janky...but it looks like there's a possibility that
    // the Crunchbase API will have 2 URLs separated by a space for an
    // organization. For example, see the following:
    // https://www.crunchbase.com/organization/discovery-inc
    // The URL is "www.discovery.com | wbd.com". We just want the first one.
    if (website_url.includes(' ')) {
      website_url = website_url.split(' ')[0];
    }

    const { hostname } = new URL(website_url);

    // This should be unique in our system.
    domain = getDomainFromHostname(hostname);
  }

  const result = BaseCompany.extend({
    linkedInUrl: z.string().url().optional(),
  }).safeParse({
    crunchbaseId: fields.identifier.uuid,
    description: fields.short_description,
    domain,
    linkedInUrl: fields.linkedin?.value,
    name: fields.identifier.value,
    imageUrl: fields.image_url,
    stockSymbol: fields.listed_stock_symbol,
  });

  if (!result.success) {
    throw new Error('Failed to validate Crunchbase organization data.');
  }

  return result.data;
}

function getDomainFromHostname(hostname: string) {
  return hostname.split('.').slice(-2).join('.');
}
