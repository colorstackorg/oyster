import { sql } from 'kysely';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';

const SLACK_BIRTHDAYS_CHANNEL_ID = process.env.SLACK_BIRTHDAYS_CHANNEL_ID;

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
    .where('slackId', 'is not', null)
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
    channel: SLACK_BIRTHDAYS_CHANNEL_ID as string,
    message: `Everyone wish a happy birthday to ${result}! 🎉🎂🎈`,
    workspace: 'regular',
  });
}
