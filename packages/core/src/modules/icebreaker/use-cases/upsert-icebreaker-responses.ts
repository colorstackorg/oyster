import { Insertable, Transaction } from 'kysely';

import { DB } from '@oyster/db';

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
