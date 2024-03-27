import { Insertable, Transaction } from 'kysely';
import type { DB, IcebreakerResponses } from 'kysely-codegen/dist/db';

export async function upsertIcebreakerResponses(
  trx: Transaction<DB>,
  memberId: string,
  data: Insertable<IcebreakerResponses>[]
) {
  await trx
    .deleteFrom('icebreakerResponses')
    .where('studentId', '=', memberId)
    .execute();

  await trx.insertInto('icebreakerResponses').values(data).execute();
}
