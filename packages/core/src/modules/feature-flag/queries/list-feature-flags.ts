import { db } from '@oyster/db';

export async function listFeatureFlags() {
  const flags = await db
    .selectFrom('featureFlags')
    .select(['code', 'createdAt', 'description', 'enabled', 'id', 'name'])
    .execute();

  return flags;
}
