import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { z } from 'zod';

import { searchCountries } from '../shared/core.server';
import { ensureUserAuthenticated } from '../shared/session.server';

const CountriesSearchParams = z.object({
  search: z.string().trim().min(1).catch(''),
});

export type SearchCountriesResult = SerializeFrom<typeof loader>;

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const { search } = CountriesSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const countries = await searchCountries({
    select: [
      'countries.code',
      'countries.demonym',
      'countries.flagEmoji',
      'countries.name',
    ],
    where: { search },
  });

  return json({
    countries,
  });
}
