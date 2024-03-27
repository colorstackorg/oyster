import { ApplicationStatus } from '@colorstack/types';

import { db } from '@/infrastructure/database';

export async function countPendingApplications() {
  const result = await db
    .selectFrom('applications')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('status', '=', ApplicationStatus.PENDING)
    .executeTakeFirstOrThrow();

  const count = Number(result.count);

  return count;
}
