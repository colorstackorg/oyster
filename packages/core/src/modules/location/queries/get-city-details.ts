import { z } from 'zod';

import {
  getGoogleMapsKey,
  GOOGLE_PLACES_API_URL,
  GoogleKeyMissingError,
  GooglePlacesError,
} from '../location.shared';

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
