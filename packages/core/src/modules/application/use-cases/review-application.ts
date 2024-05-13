import type { Application } from '@oyster/types';
import { ApplicationStatus } from '@oyster/types';

import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { getPostmarkInstance } from '@/modules/notification/shared/email.utils';

export async function reviewApplication({
  applicationId,
}: GetBullJobData<'application.review'>) {
  const application = await db
    .selectFrom('applications')
    .select([
      'applications.createdAt',
      'applications.educationLevel',
      'applications.email',
      'applications.firstName',
      'applications.graduationYear',
      'applications.id',
      'applications.linkedInUrl',
      'applications.major',
      'applications.race',
      'applications.schoolId',
    ])
    .where('id', '=', applicationId)
    .where('status', '=', ApplicationStatus.PENDING)
    .executeTakeFirstOrThrow();

  const reject = await shouldReject(application as ApplicationForDecision);

  if (!reject) {
    return;
  }

  await db
    .updateTable('applications')
    .set({
      rejectedAt: new Date(),
      status: ApplicationStatus.REJECTED,
    })
    .where('id', '=', application.id)
    .execute();

  job('application.rejected', {
    applicationId: application.id,
    automated: true,
  });
}

type ApplicationForDecision = Pick<
  Application,
  | 'createdAt'
  | 'educationLevel'
  | 'email'
  | 'graduationYear'
  | 'id'
  | 'linkedInUrl'
  | 'major'
  | 'race'
  | 'schoolId'
>;

async function shouldReject(
  application: ApplicationForDecision
): Promise<boolean> {
  if (application.educationLevel !== 'undergraduate') {
    return true;
  }

  const currentYear = new Date().getFullYear();

  if (
    application.graduationYear < currentYear ||
    application.graduationYear > currentYear + 5
  ) {
    return true;
  }

  const memberWithSameEmail = await db
    .selectFrom('studentEmails')
    .where('email', 'ilike', application.email)
    .executeTakeFirst();

  if (memberWithSameEmail) {
    return true;
  }

  const postmark = getPostmarkInstance();

  const bounces = await postmark.getBounces({
    count: 1,
    emailFilter: application.email,
    inactive: true,
  });

  if (bounces.TotalCount >= 1) {
    return true;
  }

  return false;
}
