import { ONE_WEEK_IN_SECONDS, withCache } from '@/infrastructure/redis';
import { BaseCompany } from '../employment.types';
import {
  crunchbaseRateLimiter,
  getCrunchbaseKey,
  getCrunchbaseLogoUri,
  getCrunchbasePathname,
} from '../shared/crunchbase.utils';

type CrunchbaseAutocompleteData = {
  count: number;
  entities: {
    facet_ids: string[];
    identifier: {
      image_id?: string;
      uuid: string;
      value: string;
    };
    short_description: string;
  }[];
};

/**
 * Searches the Crunchbase API for organizations based on the given search
 * string. This function validates and formats the data into an array of partial
 * `Company` objects.
 *
 * @param search - Search string to use when searching for organizations.
 *
 * @throws `Error` if the `CRUNCHBASE_BASIC_API_KEY` variable is missing.
 * @throws `Error` if the Crunchbase API request fails.
 * @throws `Error` if the Crunchbase organization data is invalid.
 *
 * @see https://data.crunchbase.com/docs/examples-entity-lookup-api
 */
export async function searchCrunchbaseOrganizations(
  search: string
): Promise<BaseCompany[]> {
  const key = getCrunchbaseKey();

  const companies = await withCache<BaseCompany[]>(
    `search-crunchbase-organizations:${search}`,
    ONE_WEEK_IN_SECONDS,
    async () => {
      const pathname = getCrunchbasePathname('/autocompletes');
      const url = new URL(pathname);

      url.searchParams.set('collection_ids', 'organizations');
      url.searchParams.set('query', search);
      url.searchParams.set('user_key', key);

      await crunchbaseRateLimiter.process();

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          'Failed to search for organizations from the Crunchbase API.'
        );
      }

      // TODO: Should actually validate this data in the future...
      const data: CrunchbaseAutocompleteData = await response.json();

      const companies = data.entities.map(
        ({ identifier, short_description }) => {
          const imageUrl = identifier.image_id
            ? getCrunchbaseLogoUri(identifier.image_id)
            : undefined;

          const result = BaseCompany.safeParse({
            crunchbaseId: identifier.uuid,
            description: short_description,
            imageUrl,
            name: identifier.value,
          });

          if (!result.success) {
            throw new Error('Failed to validate Crunchbase organization data.');
          }

          return result.data;
        }
      );

      return companies;
    }
  );

  return companies;
}
