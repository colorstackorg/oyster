import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { sql } from 'kysely';
import { z } from 'zod';

import { db } from '../shared/core.server';
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

  const countries = await searchCountries(search);

  return json({
    countries,
  });
}

async function searchCountries(search: string) {
  const countries = await db
    .selectFrom('countries')
    .select([
      'countries.code',
      'countries.demonym',
      'countries.flagEmoji',
      'countries.name',
    ])
    .$if(!!search, (qb) => {
      return qb
        .where((eb) => {
          return eb.or([
            eb('countries.code', 'ilike', `${search}%`),
            eb('countries.demonym', 'ilike', `%${search}%`),
            eb('countries.name', 'ilike', `%${search}%`),
            eb('countries.flagEmoji', '=', search),
            sql`similarity(countries.name, ${search}) > 0.5`,
          ]);
        })
        .orderBy(sql`similarity(countries.name, ${search})`, 'desc');
    })
    .orderBy('countries.demonym', 'asc')
    .execute();

  return countries;
}
