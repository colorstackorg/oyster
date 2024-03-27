import Statsig from 'statsig-node';

import { ENV } from '@/shared/env';
import { getStatsigKey } from '../feature-flag.shared';

/**
 * Establishes a connection to the feature flag server. This function should be
 * called once before our application's server starts.
 *
 * Uses Statsig under the hood, so it requires the `STATSIG_SECRET_KEY`
 * environment variable to be set. If the key is missing, this function will
 * do nothing.
 */
export async function initializeFeatureFlagServer() {
  const key = getStatsigKey();

  if (!key) {
    return;
  }

  await Statsig.initialize(key, {
    environment: {
      tier: ENV.ENVIRONMENT,
    },
  });
}
