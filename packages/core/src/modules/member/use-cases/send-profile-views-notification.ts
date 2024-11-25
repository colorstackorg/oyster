import dayjs from 'dayjs';

import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function sendProfileViewsNotification(
  _: GetBullJobData<'profile.views.notification.monthly'>
) {
  const startOfLastMonth = dayjs()
    .subtract(1, 'month')
    .startOf('month')
    .toDate();

  const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month').toDate();

  const records = await db
    .with('aggregatedViews', (db) => {
      return db
        .selectFrom('profileViews')
        .select([
          'profileViews.profileViewedId',
          (eb) => eb.fn.countAll<string>().as('views'),
        ])
        .where('profileViews.viewedAt', '>=', startOfLastMonth)
        .where('profileViews.viewedAt', '<=', endOfLastMonth)
        .whereRef('profileViews.profileViewedId', '!=', 'profileViews.viewerId')
        .groupBy('profileViews.profileViewedId')
        .having((eb) => eb.fn.countAll(), '>=', 3);
    })
    .selectFrom('aggregatedViews')
    .leftJoin('students', 'students.id', 'aggregatedViews.profileViewedId')
    .select(['students.id', 'students.slackId', 'views'])
    .orderBy('views', 'desc')
    .execute();

  records.forEach((record) => {
    if (record.slackId) {
      job('notification.slack.send', {
        channel: record.slackId,
        message: `Last month, your profile was viewed ${record.views} times in the <https://app.colorstack.io/directory|*Member Directory*>! Keep it up! 🎉`,
        workspace: 'regular',
      });
    }
  });
}
