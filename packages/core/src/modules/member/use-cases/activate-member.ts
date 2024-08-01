import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';

export async function activateMember(id: string) {
  await db
    .updateTable('students')
    .set({ activatedAt: new Date() })
    .where('id', '=', id)
    .execute();

  job('student.activated', {
    studentId: id,
  });
}
