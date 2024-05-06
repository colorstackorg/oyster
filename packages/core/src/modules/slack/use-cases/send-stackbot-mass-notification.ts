import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function sendStackBotMassNotification(
  data: GetBullJobData<'slack.mass.message'>
) {
  const members = await db.selectFrom('students').select(['slackId']).execute();

  members.forEach((member) => {
    if (member.slackId) {
      job('notification.slack.send', {
        channel: member.slackId,
        message: data.message,
        workspace: 'regular',
      });
    }
  });
}
