import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';

import { getCityDetails } from '@oyster/core/location';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const details = await getCityDetails(params.id as string);

  return json({
    details,
  });
}

export type CityDetailsResult = SerializeFrom<typeof loader>;
