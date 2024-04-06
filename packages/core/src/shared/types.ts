import { z } from 'zod';

import { type ExtractValue, Timezone } from '@oyster/types';

// Schemas

export const Environment = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export const ListSearchParams = z.object({
  limit: z.coerce.number().min(10).max(100).catch(100),
  page: z.coerce.number().min(1).catch(1),
  search: z.string().optional().catch(''),
  timezone: Timezone,
});

// Types

export type Environment = ExtractValue<typeof Environment>;
export type ListSearchParams = z.infer<typeof ListSearchParams>;
