import { type SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';

type GetMembersOptions<Selection> = {
  select: Selection[];
  where: { id: string };
};

export async function getFeatureFlag<
  Selection extends SelectExpression<DB, 'featureFlags'>,
>({ select, where }: GetMembersOptions<Selection>) {
  const flag = await db
    .selectFrom('featureFlags')
    .select(select)
    .where('id', '=', where.id)
    .executeTakeFirst();

  return flag;
}
