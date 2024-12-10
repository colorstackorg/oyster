import { db } from '@oyster/db';

import { type FeatureFlagName } from '../feature-flags.types';

export async function isFeatureFlagEnabled(name: FeatureFlagName) {
  const enabledFlag = await db
    .selectFrom('featureFlags')
    .where('enabled', '=', true)
    .where('name', '=', name)
    .executeTakeFirst();

  return !!enabledFlag;
}
