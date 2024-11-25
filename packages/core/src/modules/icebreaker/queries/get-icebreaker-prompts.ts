import type { SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';

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
