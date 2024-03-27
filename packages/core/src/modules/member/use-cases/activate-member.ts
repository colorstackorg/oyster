import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

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
