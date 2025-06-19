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

type AutocompleteType = '(cities)' | 'establishment' | 'geocode';

/**
 * Returns a list of places that match the search term.
 *
 * Uses the Google Maps Places API under the hood, so it is required to have the
 * `GOOGLE_MAPS_API_KEY` environment variable set.
 *
 * @param search - The search term to use for autocompletion.
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/autocomplete
 */
export async function getAutocompletedPlaces(
  search: string,
  type?: AutocompleteType
) {
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
      ...(type && { types: type }),
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
    `google:places:autocomplete:v3:${search}:${type}`,
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
    formatted_address: z.string().trim().min(1),
    geometry: z.object({
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    }),
  }),
});

type PlaceDetails = {
  city: string | null;
  country: string | null;
  formattedAddress: string;
  id: string;
  latitude: number;
  longitude: number;
  postalCode: string | null;
  state: string | null;
};

/**
 * Returns important information about a place.
 *
 * Uses the Google Maps Places API under the hood, so it is required to have the
 * `GOOGLE_MAPS_API_KEY` environment variable set.
 *
 * @param id - The ID of the "Google Place".
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/details
 */
export async function getPlaceDetails(
  id: string
): Promise<PlaceDetails | null> {
  async function fn() {
    if (!GOOGLE_MAPS_API_KEY) {
      return null;
    }

    const uri = new URL(
      'https://maps.googleapis.com/maps/api/place/details/json'
    );

    const searchParams = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      fields: ['address_components', 'formatted_address', 'geometry'].join(','),
      place_id: id,
    });

    uri.search = searchParams.toString();

    const response = await fetch(uri);
    const json = await response.json();

    if (!response.ok) {
      const _ = new ColorStackError()
        .withMessage('Failed to get place details from Google.')
        .withContext({ response: json, status: response.status })
        .report();

      return null;
    }

    const result = GooglePlaceDetailsResponse.safeParse(json);

    if (!result.success) {
      const _ = new ColorStackError()
        .withMessage('Failed to validate place details from Google.')
        .withContext({ error: result.error, response: json })
        .report();

      return null;
    }

    const { address_components, formatted_address, geometry } =
      result.data.result;

    let cityComponent = address_components.find((component) => {
      return (
        component.types.includes('locality') ||
        component.types.includes('administrative_area_level_3')
      );
    });

    cityComponent ||= address_components.find((component) => {
      return component.types.includes('postal_town');
    });

    cityComponent ||= address_components.find((component) => {
      return component.types.includes('sublocality');
    });

    const postalCodeComponent = address_components.find((component) => {
      return component.types.includes('postal_code');
    });

    const stateComponent = address_components.find((component) => {
      return component.types.includes('administrative_area_level_1');
    });

    const countryComponent = address_components.find((component) => {
      return component.types.includes('country');
    });

    return {
      city: cityComponent?.long_name || null,
      country: countryComponent?.short_name || null,
      formattedAddress: formatted_address,
      id,
      latitude: geometry.location.lat,
      longitude: geometry.location.lng,
      postalCode: postalCodeComponent?.short_name || null,
      state: stateComponent?.short_name || null,
    };
  }

  return withCache(`google:places:details:v4:${id}`, 60 * 60 * 24 * 90, fn);
}

/**
 * Finds the most relevant location using the Google Places API. This function
 * uses the autocomplete endpoint to find a list of matched cities. We choose
 * the top match and then use the details endpoint to get the address components
 * and coordinates.
 *
 * @param location - Location name to search for.
 * @returns Promise resolving to the most relevant matching location, if found.
 */
export async function getMostRelevantLocation(
  location: string | null | undefined,
  type?: AutocompleteType
) {
  async function fn() {
    if (!location) {
      return null;
    }

    const places = await getAutocompletedPlaces(location, type);

    if (!places || !places.length) {
      return null;
    }

    return getPlaceDetails(places[0].id);
  }

  return withCache(
    `${getMostRelevantLocation.name}:v2:${location}:${type}`,
    60 * 60 * 24 * 30,
    fn
  );
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
