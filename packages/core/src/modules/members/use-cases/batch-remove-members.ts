import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function batchRemoveMembers({
  memberIds,
}: GetBullJobData<'student.batch_remove'>) {
  const students = await db
    .deleteFrom('students')
    .where('id', 'in', memberIds)
    .returning(['airtableId', 'email', 'firstName', 'slackId'])
    .execute();

  for (const student of students) {
    job('student.removed', {
      airtableId: student.airtableId as string,
      email: student.email,
      firstName: student.firstName,
      sendViolationEmail: false,
      slackId: student.slackId,
    });
  }
}
