import { ApplicationStatus } from '@oyster/types';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function rejectApplication(
  applicationId: string,
  adminId: string
) {
  await db
    .updateTable('applications')
    .set({
      rejectedAt: new Date(),
      reviewedById: adminId,
      status: ApplicationStatus.REJECTED,
    })
    .where('id', '=', applicationId)
    .execute();

  job('application.rejected', {
    applicationId,
  });
}
