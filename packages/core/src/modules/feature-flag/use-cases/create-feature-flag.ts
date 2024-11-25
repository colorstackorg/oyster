import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type CreateFeatureFlagInput } from '@/modules/feature-flag/feature-flag.types';

export async function createFeatureFlag(input: CreateFeatureFlagInput) {
  const flag = await db
    .insertInto('featureFlags')
    .values({
      description: input.description,
      displayName: input.displayName,
      enabled: input.enabled,
      id: id(),
      name: input.name,
    })
    .returning(['name'])
    .executeTakeFirstOrThrow();

  return flag;
}
