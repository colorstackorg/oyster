import { type LoaderFunctionArgs } from 'react-router';

import { getPlaceDetails } from '@oyster/core/location';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const details = await getPlaceDetails(params.id as string);

  return details;
}
