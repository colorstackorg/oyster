import { db } from '@oyster/db';

import { type EditFeatureFlagInput } from '@/modules/feature-flag/feature-flag.types';

export async function editFeatureFlag(id: string, input: EditFeatureFlagInput) {
  const flag = await db
    .updateTable('featureFlags')
    .set({
      description: input.description,
      displayName: input.displayName,
      enabled: input.enabled,
    })
    .where('id', '=', id)
    .returning(['name'])
    .executeTakeFirstOrThrow();

  return flag;
}
