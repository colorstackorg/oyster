import { z } from 'zod';

import { BooleanInput, Entity } from '@oyster/types';

export type FeatureFlagName =
  | 'companies'
  | 'family_application'
  | 'resume_books';

// Domain

const FeatureFlag = z.object({
  createdAt: Entity.shape.createdAt,
  description: z.string().trim().optional(),
  displayName: z.string().trim().min(1),
  enabled: BooleanInput,
  id: Entity.shape.id,
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

export const EditFeatureFlagInput = FeatureFlag.pick({
  description: true,
  displayName: true,
  enabled: true,
});

export type EditFeatureFlagInput = z.infer<typeof EditFeatureFlagInput>;
