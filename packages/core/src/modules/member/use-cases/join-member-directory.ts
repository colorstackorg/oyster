import { type Transaction } from 'kysely';

import { type DB } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';

export async function joinMemberDirectory(
  trx: Transaction<DB>,
  memberId: string
) {
  const { numUpdatedRows } = await trx
    .updateTable('students')
    .set({ joinedMemberDirectoryAt: new Date() })
    .where('joinedMemberDirectoryAt', 'is', null)
    .where('id', '=', memberId)
    .executeTakeFirst();

  if (numUpdatedRows >= 1) {
    job('gamification.activity.completed', {
      studentId: memberId,
      type: 'join_member_directory',
    });
  }
}
