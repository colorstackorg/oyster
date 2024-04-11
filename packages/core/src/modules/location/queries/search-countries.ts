import { type SelectExpression, sql } from 'kysely';

import { type DB, db } from '@oyster/db';

type SearchCountriesOptions<Selection> = {
  select: Selection[];
  where: {
    search: string;
  };
};

export async function searchCountries<
  Selection extends SelectExpression<DB, 'countries'>,
>(options: SearchCountriesOptions<Selection>) {
  const { select, where } = options;
  const { search } = where;

  const countries = await db
    .selectFrom('countries')
    .select(select)
    .$if(!!search, (qb) => {
      return qb
        .where((eb) => {
          return eb.or([
            eb('countries.code', 'ilike', `${search}%`),
            eb('countries.demonym', 'ilike', `%${search}%`),
            eb('countries.name', 'ilike', `%${search}%`),
            eb('countries.flagEmoji', '=', search),
            sql<boolean>`similarity(countries.name, ${search}) > 0.5`,
          ]);
        })
        .orderBy(sql`similarity(countries.name, ${search})`, 'desc');
    })
    .orderBy('countries.demonym', 'asc')
    .execute();

  return countries;
}
