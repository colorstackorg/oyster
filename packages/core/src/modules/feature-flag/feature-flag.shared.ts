import { z } from 'zod';

// Helpers

export function getStatsigKey() {
  const result = z
    .string()
    .trim()
    .min(1)
    .safeParse(process.env.STATSIG_SECRET_KEY);

  if (!result.success) {
    console.warn(
      '"STATSIG_SECRET_KEY" environment variable is missing, so feature flags will not be enabled.'
    );

    return null;
  }

  return result.data;
}

// Types

export type FeatureFlag = 'census_2024';
