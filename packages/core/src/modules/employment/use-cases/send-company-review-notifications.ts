import dayjs from 'dayjs';
import dedent from 'dedent';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { ENV } from '@/shared/env';

/**
 * This is a monthly job that runs and finds all students that have had a work
 * experience end in the last month. Then, it has the ColorStack bot send a DM
 * to all these students suggesting that they add a review of their experience.
 */
export async function sendCompanyReviewNotifications() {
  const startOfCurrentMonth = dayjs().startOf('month').toDate();

  const startOfPreviousMonth = dayjs()
    .startOf('month')
    .subtract(1, 'month')
    .toDate();

  const workExperiences = await db
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .leftJoin(
      'companyReviews',
      'companyReviews.workExperienceId',
      'workExperiences.id'
    )
    .leftJoin('students', 'students.id', 'workExperiences.studentId')
    .select([
      'companies.name as companyName',
      'students.slackId as memberSlackId',
      'workExperiences.id',
      'workExperiences.title',
    ])
    .where('companies.name', 'is not', null)
    .where('companyReviews.id', 'is', null)
    .where('workExperiences.endDate', '>=', startOfPreviousMonth)
    .where('workExperiences.endDate', '<', startOfCurrentMonth)
    .where('workExperiences.endDate', 'is not', null)
    .execute();

  workExperiences.forEach(({ companyName, id, memberSlackId, title }) => {
    const reviewURL = new URL(
      '/profile/work/' + id + '/review/add',
      ENV.STUDENT_PROFILE_URL
    );

    const message = dedent`
      Congratulations on completing your role as *${title}* at *${companyName}*! 🎉

      Please take a moment to <${reviewURL}|*share a review*> -- your ColorStack peers would love to hear about it!
    `;

    job('notification.slack.send', {
      channel: memberSlackId as string,
      message,
      workspace: 'regular',
    });
  });
}
