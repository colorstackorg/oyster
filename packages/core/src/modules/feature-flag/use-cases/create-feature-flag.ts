import { db } from '@oyster/db';

import { type CreateFeatureFlagInput } from '@/modules/feature-flag/feature-flag.types';

export async function createFeatureFlag(input: CreateFeatureFlagInput) {
  const flag = await db
    .insertInto('featureFlags')
    .values({
      description: input.description,
      displayName: input.displayName,
      enabled: input.enabled,
      name: input.name,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();

  return flag;
}
