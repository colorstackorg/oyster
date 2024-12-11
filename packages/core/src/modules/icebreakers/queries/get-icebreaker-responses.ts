import type { SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';

export async function getIcebreakerResponses<
  Selection extends SelectExpression<DB, 'icebreakerResponses'>,
>(memberId: string, selections: Selection[]) {
  const icebreakerResponses = await db
    .selectFrom('icebreakerResponses')
    .select(selections)
    .leftJoin(
      'icebreakerPrompts',
      'icebreakerPrompts.id',
      'icebreakerResponses.promptId'
    )
    .select(['icebreakerPrompts.text as prompt'])
    .where('icebreakerResponses.studentId', '=', memberId)
    .orderBy('icebreakerResponses.respondedAt', 'asc')
    .limit(3)
    .execute();

  return icebreakerResponses;
}
