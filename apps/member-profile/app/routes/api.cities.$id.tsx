import { json, type LoaderFunctionArgs } from '@remix-run/node';

import { getPlaceDetails } from '@oyster/core/location';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const details = await getPlaceDetails(params.id as string);

  return json(details);
}
