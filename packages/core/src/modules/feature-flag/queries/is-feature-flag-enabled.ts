import { db } from '@oyster/db';

import { type FeatureFlag } from '../feature-flag.shared';

export async function isFeatureFlagEnabled(flag: FeatureFlag) {
  const enabledFlag = await db
    .selectFrom('featureFlags')
    .where('code', '=', flag)
    .where('enabled', '=', true)
    .executeTakeFirst();

  return !!enabledFlag;
}
