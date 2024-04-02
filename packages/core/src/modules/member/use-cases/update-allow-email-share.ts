import { Transaction } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';

export async function updateAllowEmailShare(
  trx: Transaction<DB>,
  id: string,
  allowEmailShareBool: boolean
) {
  await trx
    .updateTable('students')
    .set({ allowEmailShare: allowEmailShareBool })
    .where('id', '=', id)
    .execute();
}
