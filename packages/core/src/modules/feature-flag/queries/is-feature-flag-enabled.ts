import Statsig from 'statsig-node';

import { type FeatureFlag, getStatsigKey } from '../feature-flag.shared';

type IsFeatureFlagEnabledOptions = {
  user: string;
};

/**
 * Checks whether the specified feature flag is enabled. If you need to check
 * if the feature flag is enabled for a specific user, you can pass in the
 * user's ID.
 *
 * Uses Statsig under the hood, so it requires the `STATSIG_SECRET_KEY`
 * environment variable to be set. If the key is missing, this function will
 * always return `false`.
 */
export async function isFeatureFlagEnabled(
  flag: FeatureFlag,
  options: IsFeatureFlagEnabledOptions = { user: '' }
) {
  const key = getStatsigKey();

  if (!key) {
    return false;
  }

  const enabled = await Statsig.checkGate({ userID: options.user }, flag);

  return enabled;
}
