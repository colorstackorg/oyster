import { z } from 'zod';

import {
  getGoogleMapsKey,
  GOOGLE_PLACES_API_URL,
  GooglePlacesError,
} from '../location.shared';

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
