import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onMemberRemoved({
  airtableId,
  email,
  sendViolationEmail,
  slackId,
}: GetBullJobData<'student.removed'>) {
  job('airtable.record.delete', {
    airtableId,
  });

  job('email_marketing.remove', {
    email,
  });

  job('notification.slack.send', {
    message: `Member with the email "${email}" has been removed from ColorStack.`,
    workspace: 'internal',
  });

  if (slackId) {
    job('slack.deactivate', {
      slackId,
    });
  }

  if (sendViolationEmail) {
    job('notification.email.send', {
      to: email,
      name: 'student-removed',
      data: {},
    });
  }
}
