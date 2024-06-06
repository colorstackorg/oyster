import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListSearchParams } from '@/shared/types';

type ListCompaniesOptions<Selection> = {
  pagination: Pick<ListSearchParams, 'limit' | 'page'>;
  select: Selection[];
  where: { search: string };
};

export async function listCompanies<
  Selection extends SelectExpression<DB, 'companies'>,
>({ pagination, select, where }: ListCompaniesOptions<Selection>) {
  const [companies, { count }] = await Promise.all([
    db
      .selectFrom('companies')
      .select(select)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit)
      .execute(),

    db
      .selectFrom('companies')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    companies,
    totalCount: Number(count),
  };
}
