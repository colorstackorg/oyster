import type { SelectExpression } from 'kysely';

import { DB } from '@oyster/db';

import { db } from '@/infrastructure/database';

export async function getIcebreakerPrompts<
  Selection extends SelectExpression<DB, 'icebreakerPrompts'>,
>(selections: Selection[]) {
  const prompts = await db
    .selectFrom('icebreakerPrompts')
    .select(selections)
    .where('deletedAt', 'is', null)
    .orderBy('text', 'asc')
    .execute();

  return prompts;
}
