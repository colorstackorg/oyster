import { useSearchParams as _useSearchParams } from '@remix-run/react';
import { z } from 'zod';

export function useSearchParams<Schema extends z.AnyZodObject>(
  schema: Schema
): [z.infer<Schema>] {
  const [_searchParams] = _useSearchParams();

  const searchParams = schema.parse(Object.fromEntries(_searchParams));

  return [searchParams];
}
