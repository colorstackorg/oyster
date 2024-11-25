import { db } from '@oyster/db';

export async function listFeatureFlags() {
  const flags = await db
    .selectFrom('featureFlags')
    .select(['description', 'displayName', 'enabled', 'id', 'name'])
    .orderBy('createdAt', 'desc')
    .execute();

  return flags;
}
