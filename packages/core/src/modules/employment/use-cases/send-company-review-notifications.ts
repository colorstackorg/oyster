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
  const now = new Date();

  const firstDayOfPreviousMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );

  const firstDayOfCurrentMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const results = await db
    .selectFrom('workExperiences')
    .leftJoin('students', 'students.id', 'workExperiences.studentId')
    .select([
      'workExperiences.companyId',
      'workExperiences.companyName',
      'students.firstName as studentName',
      'students.slackId as studentSlackId',
    ])
    .where('endDate', '>=', firstDayOfPreviousMonth)
    .where('endDate', '<', firstDayOfCurrentMonth)
    .where('endDate', 'is not', null)
    .execute();

  results.forEach((result) => {
    const { companyId, companyName, studentName, studentSlackId } = result;

    if (!companyId || !companyName || !studentName || !studentSlackId) {
      console.warn(`Skipping notification due to missing data:`, result);

      return;
    }

    const companyURL = new URL(
      '/companies/' + companyId,
      ENV.STUDENT_PROFILE_URL
    );

    const message = dedent`
      Hey ${studentName},

      Congratulations on completing your work experience at ${companyName}! 🎉

      We'd love to hear about your experience! Please take a moment to share a review on
      <${companyURL}|*${companyName}*>'s company page.

      Thanks!
      The ColorStack Team
    `;

    job('notification.slack.send', {
      channel: studentSlackId as string,
      message,
      workspace: 'regular',
    });
  });
}
