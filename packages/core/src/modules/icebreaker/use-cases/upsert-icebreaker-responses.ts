import { type Insertable, type Transaction } from 'kysely';

import { type DB } from '@oyster/db';

export async function upsertIcebreakerResponses(
  trx: Transaction<DB>,
  memberId: string,
  data: Insertable<DB['icebreakerResponses']>[]
) {
  await trx
    .deleteFrom('icebreakerResponses')
    .where('studentId', '=', memberId)
    .execute();

  await trx.insertInto('icebreakerResponses').values(data).execute();
}
