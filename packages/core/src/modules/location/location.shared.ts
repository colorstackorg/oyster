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

// Helpers

export function getGoogleMapsKey() {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn(GOOGLE_MAPS_API_KEY_MISSING_MESSAGE);

    return null;
  }

  return GOOGLE_MAPS_API_KEY;
}
