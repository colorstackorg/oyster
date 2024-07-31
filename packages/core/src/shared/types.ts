import { z } from 'zod';

import { type ExtractValue, Timezone } from '@oyster/types';

// Schemas

export const Environment = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export const PaginationSearchParams = z.object({
  limit: z.coerce.number().min(10).max(100).catch(100),
  page: z.coerce.number().min(1).catch(1),
});

export const ListSearchParams = PaginationSearchParams.extend({
  search: z.string().optional().catch(''),
  timezone: Timezone,
});

// Types

export type Environment = ExtractValue<typeof Environment>;
export type ListSearchParams = z.infer<typeof ListSearchParams>;
export type PaginationSearchParams = z.infer<typeof PaginationSearchParams>;

export type Nullable<T> = T | null;

export type QueryOptions<Selection, Where> = {
  select: Selection[];
  where: Where;
};
