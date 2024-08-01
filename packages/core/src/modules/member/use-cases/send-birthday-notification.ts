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
    .select(['slackId'])
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

  // We won't send a notification if there are no members with birthdays today!
  if (!members.length) {
    return;
  }

  const ids = members.map((member) => {
    return `<@${member.slackId}>`;
  });

  const last = ids.pop();

  // Example (1): <@U123>
  // Example (2): <@U123> and <@U456>
  // Example (3): <@U123>, <@U456> and <@U789>
  // Example (4): <@U123>, <@U456>, <@U789> and <@123>
  const result = ids.length ? `${ids.join(', ')} and ${last}` : last;

  job('notification.slack.send', {
    channel: ENV.SLACK_BIRTHDAYS_CHANNEL_ID,
    message: `Everyone wish a happy birthday to ${result}! 🎉🎂🎈`,
    workspace: 'regular',
  });
}
