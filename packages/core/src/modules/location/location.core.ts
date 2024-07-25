import { type SelectExpression, sql } from 'kysely';
import { z } from 'zod';

import { type DB, db } from '@oyster/db';

import { ErrorWithContext } from '@/shared/errors';

// Constants

export const GOOGLE_PLACES_API_URL =
  'https://maps.googleapis.com/maps/api/place';

// Errors

export class GooglePlacesError extends ErrorWithContext {}

const GOOGLE_MAPS_API_KEY_MISSING_MESSAGE =
  '"GOOGLE_MAPS_API_KEY" is not set, so Google Maps API is disabled.';

export class GoogleKeyMissingError extends ErrorWithContext {
  constructor() {
    super(GOOGLE_MAPS_API_KEY_MISSING_MESSAGE);
  }
}

// Google API

const GoogleAutocompleteData = z.object({
  predictions: z
    .object({
      description: z.string().trim().min(1),
      place_id: z.string().trim().min(1),
    })
    .array(),
});

/**
 * Returns a list of cities that match the search term.
 *
 * Uses the Google Maps Places API under the hood, so it is required to have the
 * `GOOGLE_MAPS_API_KEY` environment variable set.
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/autocomplete
 *
 * @param search - The search term to use for autocompletion.
 */
export async function getAutocompletedCities(search: string) {
  const url = new URL(GOOGLE_PLACES_API_URL + '/autocomplete/json');

  const key = getGoogleMapsKey();

  if (!key) {
    return [];
  }

  url.searchParams.set('key', key);
  url.searchParams.set('input', search);
  url.searchParams.set(
    'types',
    ['locality', 'administrative_area_level_3', 'neighborhood'].join('|')
  );

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new GooglePlacesError(
      'Failed to get autocompleted cities from Google.'
    ).withContext(data);
  }

  const result = GoogleAutocompleteData.safeParse(data);

  if (!result.success) {
    throw new GooglePlacesError(
      'Failed to validate autocompleted cities from Google.'
    ).withContext(data);
  }

  const cities = result.data.predictions.map((prediction) => {
    return {
      description: prediction.description,
      id: prediction.place_id,
    };
  });

  return cities;
}

const GooglePlaceDetailsResponse = z.object({
  result: z.object({
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
 * @see https://developers.google.com/maps/documentation/places/web-service/details
 *
 * @param id - The ID of the "Google Place".
 */
export async function getCityDetails(id: string) {
  const url = new URL(GOOGLE_PLACES_API_URL + '/details/json');

  const key = getGoogleMapsKey();

  if (!key) {
    throw new GoogleKeyMissingError();
  }

  url.searchParams.set('key', key);
  url.searchParams.set('fields', 'geometry,name');
  url.searchParams.set('place_id', id);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new GooglePlacesError(
      'Failed to get city details from Google.'
    ).withContext(data);
  }

  const result = GooglePlaceDetailsResponse.safeParse(data);

  if (!result.success) {
    throw new GooglePlacesError(
      'Failed to validate city details from Google.'
    ).withContext(data);
  }

  const { geometry, name } = result.data.result;

  const details = {
    id,
    latitude: geometry.location.lat,
    longitude: geometry.location.lng,
    name,
  };

  return details;
}

// DB Queries

type SearchCountriesOptions<Selection> = {
  select: Selection[];
  where: {
    search: string;
  };
};

export async function searchCountries<
  Selection extends SelectExpression<DB, 'countries'>,
>(options: SearchCountriesOptions<Selection>) {
  const { select, where } = options;
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

// Helpers

export function getGoogleMapsKey() {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn(GOOGLE_MAPS_API_KEY_MISSING_MESSAGE);

    return null;
  }

  return GOOGLE_MAPS_API_KEY;
}
