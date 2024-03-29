import { useSearchParams as _useSearchParams } from '@remix-run/react';
import { z } from 'zod';

export function useSearchParams<Schema extends z.ZodObject<any>>(
  schema: Schema
): [z.infer<Schema>] {
  const [_searchParams, _setSearchParams] = _useSearchParams();

  const searchParams = schema.parse(Object.fromEntries(_searchParams));

  return [searchParams];
}
