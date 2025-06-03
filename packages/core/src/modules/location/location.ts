import { type SelectExpression, sql } from 'kysely';
import { z } from 'zod';

import { type DB, db } from '@oyster/db';

import { withCache } from '@/infrastructure/redis';
import { ColorStackError } from '@/shared/errors';

// Environment Variables

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;

// Google API

// "Get Autocompleted Cities"

const GooglePrediction = z.object({
  description: z.string().trim().min(1),
  place_id: z.string().trim().min(1),
});

const GoogleAutocompleteData = z.object({
  predictions: z.array(GooglePrediction),
});

/**
 * Returns a list of cities that match the search term.
 *
 * Uses the Google Maps Places API under the hood, so it is required to have the
 * `GOOGLE_MAPS_API_KEY` environment variable set.
 *
 * @param search - The search term to use for autocompletion.
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/autocomplete
 */
export async function getAutocompletedCities(search: string) {
  search = search.trim().toLowerCase();

  async function fn() {
    if (!GOOGLE_MAPS_API_KEY) {
      return null;
    }

    if (!search) {
      return [];
    }

    const uri = new URL(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json'
    );

    const searchParams = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      input: search,
      types: ['locality', 'administrative_area_level_3'].join('|'),
    });

    uri.search = searchParams.toString();

    const response = await fetch(uri);
    const json = await response.json();

    if (!response.ok) {
      const _ = new ColorStackError()
        .withMessage('Failed to get autocompleted cities from Google.')
        .withContext({ response: json, status: response.status })
        .report();

      return null;
    }

    const result = GoogleAutocompleteData.safeParse(json);

    if (!result.success) {
      const _ = new ColorStackError()
        .withMessage('Failed to validate autocompleted cities from Google.')
        .withContext({ error: result.error, response: json })
        .report();

      return null;
    }

    const cities = result.data.predictions.map((prediction) => {
      return {
        description: prediction.description,
        id: prediction.place_id,
      };
    });

    return cities;
  }

  return withCache(
    `google:places:autocomplete:${search}`,
    60 * 60 * 24 * 30,
    fn
  );
}

// "Get City Details"

const GooglePlaceDetailsResponse = z.object({
  result: z.object({
    address_components: z.array(
      z.object({
        long_name: z.string().trim().min(1),
        short_name: z.string().trim().min(1),
        types: z.array(z.string().trim().min(1)),
      })
    ),
    geometry: z.object({
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    }),
    name: z.string().trim().min(1),
  }),
});

/**
 * Returns important information about a city.
 *
 * Uses the Google Maps Places API under the hood, so it is required to have the
 * `GOOGLE_MAPS_API_KEY` environment variable set.
 *
 * @param id - The ID of the "Google Place".
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/details
 */
export async function getCityDetails(id: string) {
  async function fn() {
    if (!GOOGLE_MAPS_API_KEY) {
      return null;
    }

    const uri = new URL(
      'https://maps.googleapis.com/maps/api/place/details/json'
    );

    const searchParams = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      fields: ['address_components', 'geometry', 'name'].join(','),
      place_id: id,
    });

    uri.search = searchParams.toString();

    const response = await fetch(uri);
    const json = await response.json();

    if (!response.ok) {
      const _ = new ColorStackError()
        .withMessage('Failed to get city details from Google.')
        .withContext({ response: json, status: response.status })
        .report();

      return null;
    }

    const result = GooglePlaceDetailsResponse.safeParse(json);

    if (!result.success) {
      const _ = new ColorStackError()
        .withMessage('Failed to validate city details from Google.')
        .withContext({ error: result.error, response: json })
        .report();

      return null;
    }

    const { geometry, name, address_components } = result.data.result;

    const cityComponent = address_components.find((component) => {
      return (
        component.types.includes('locality') ||
        component.types.includes('administrative_area_level_3')
      );
    });

    const stateComponent = address_components.find((component) => {
      return component.types.includes('administrative_area_level_1');
    });

    return {
      city: cityComponent?.long_name || null,
      state: stateComponent?.short_name || null,
      id,
      latitude: geometry.location.lat,
      longitude: geometry.location.lng,
      name,
    };
  }

  return withCache(`google:places:details:${id}`, 60 * 60 * 24 * 30, fn);
}

// DB Queries

type ListCountriesOptions<Selection> = {
  select: Selection[];
  where: { search: string };
};

export async function listCountries<
  Selection extends SelectExpression<DB, 'countries'>,
>({ select, where }: ListCountriesOptions<Selection>) {
  const { search } = where;

  const countries = await db
    .selectFrom('countries')
    .select(select)
    .$if(!!search, (qb) => {
      return qb
        .where((eb) => {
          return eb.or([
            eb('countries.code', 'ilike', `${search}%`),
            eb('countries.demonym', 'ilike', `%${search}%`),
            eb('countries.name', 'ilike', `%${search}%`),
            eb('countries.flagEmoji', '=', search),
            sql<boolean>`similarity(countries.name, ${search}) > 0.5`,
          ]);
        })
        .orderBy(sql`similarity(countries.name, ${search})`, 'desc');
    })
    .orderBy('countries.demonym', 'asc')
    .execute();

  return countries;
}
