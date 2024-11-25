import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { z } from 'zod';

import { getAutocompletedCities } from '@oyster/core/location';

import { ensureUserAuthenticated } from '@/shared/session.server';

const CitiesSearchParams = z.object({
  search: z.string().trim().min(1).catch(''),
});

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const { search } = CitiesSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const cities = await getAutocompletedCities(search);

  return json(cities);
}
