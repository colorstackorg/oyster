import { sql } from 'kysely';

import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { ENV } from '@/shared/env';

export async function sendBirthdayNotification(
  _: GetBullJobData<'student.birthdate.daily'>
) {
  const members = await db
    .selectFrom('students')
    .select(['firstName', 'lastName', 'slackId'])
    .whereRef(
      sql`EXTRACT(MONTH FROM birthdate)`,
      '=',
      sql`EXTRACT(MONTH FROM CURRENT_DATE)`
    )
    .whereRef(
      sql`EXTRACT(DAY FROM birthdate)`,
      '=',
      sql`EXTRACT(DAY FROM CURRENT_DATE)`
    )
    .where('birthdateNotification', 'is', true)
    .execute();

  members.forEach((member) => {
    if (member.slackId) {
      job('notification.slack.send', {
        channel: ENV.SLACK_BIRTHDAYS_CHANNEL_ID,
        message: `Everyone wish a happy birthday to <@${member.slackId}>! 🎉🎂🎈`,
        workspace: 'regular',
      });
    }
  });
}
