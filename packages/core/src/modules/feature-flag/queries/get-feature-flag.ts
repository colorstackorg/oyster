import { db } from '@oyster/db';

export async function getFeatureFlag(id: number) {
  const flag = await db
    .selectFrom('featureFlags')
    .select(['displayName', 'id'])
    .where('id', '=', id)
    .executeTakeFirst();

  return flag;
}
