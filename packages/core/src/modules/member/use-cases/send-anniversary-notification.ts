import { sql } from 'kysely';

import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { ENV } from '@/shared/env';

export async function sendAnniversaryNotifcation(_: GetBullJobData<'student.anniversary.daily') {
  const members = await db
  .selectFrom('students')
  .select(['slackId'])
  .where

  job('notification.slack.send', {
    
  })
}
