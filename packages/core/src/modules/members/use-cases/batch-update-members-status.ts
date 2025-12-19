import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function batchUpdateMemberStatus({
  memberIds,
  status,
  sendViolationEmail,
}: GetBullJobData<'student.batch_update_status'>) {
  const students = await db
    .updateTable('students')
    .set({ status })
    .where('id', 'in', memberIds)
    .returning(['airtableId', 'email', 'firstName', 'id', 'slackId'])
    .execute();

  for (const student of students) {
    job('student.status_updated', {
      airtableId: student.airtableId as string,
      email: student.email,
      firstName: student.firstName,
      sendViolationEmail: sendViolationEmail ?? false,
      slackId: student.slackId,
      status,
      studentId: student.id,
    });
  }
}
