import { z } from 'zod';

import { BooleanInput, Entity } from '@oyster/types';

export type FeatureFlagName = 'census_2024';

// Domain

const FeatureFlag = z.object({
  createdAt: Entity.shape.createdAt,
  description: z.string().trim().optional(),
  displayName: z.string().trim().min(1),
  enabled: BooleanInput,
  id: z.coerce.number(),
  name: z
    .string()
    .trim()
    .min(1)
    .transform((value) => {
      return value.toLowerCase().replace(' ', '_');
    }),
});

// Use Case(s)

export const CreateFeatureFlagInput = FeatureFlag.pick({
  description: true,
  displayName: true,
  enabled: true,
  name: true,
});

export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagInput>;
