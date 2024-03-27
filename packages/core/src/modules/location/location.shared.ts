import { z } from 'zod';

import { ErrorWithContext } from '@/shared/errors';

// Constants

export const GOOGLE_PLACES_API_URL =
  'https://maps.googleapis.com/maps/api/place';

// Errors

export class GooglePlacesError extends ErrorWithContext {}

// Helpers

export function getGoogleMapsKey() {
  const result = z.string().min(1).safeParse(process.env.GOOGLE_MAPS_API_KEY);

  if (!result.success) {
    throw new Error('Please provide a valid Google Maps API key.');
  }

  return result.data;
}
