import dayjs from 'dayjs';
import dedent from 'dedent';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { ENV } from '@/shared/env';

type SendCompanyReviewNotificationsInput = {
  after?: Date;
  before?: Date;
};

/**
 * This job finds all members who've had a work experience that ends after
 * the `after` date and before the `before` date. It then sends a DM to them
 * asking them to share a review of their experience.
 *
 * By default, `after` is the start of the previous month and `before` is the
 * start of the current month.
 *
 * This job is idempotent. If it's run and a member has already received a
 * notification for a work experience, they won't be notified about that
 * experience again.
 */
export async function sendCompanyReviewNotifications({
  after,
  before,
}: SendCompanyReviewNotificationsInput) {
  const startOfCurrentMonth = dayjs().startOf('month');

  after ||= startOfCurrentMonth.subtract(1, 'month').toDate();
  before ||= startOfCurrentMonth.toDate();

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
    .where('workExperiences.endDate', '>=', after)
    .where('workExperiences.endDate', '<', before)
    .where('workExperiences.endDate', 'is not', null)
    .where('workExperiences.reviewNotificationSentAt', 'is', null)
    .execute();

  if (!workExperiences.length) {
    return;
  }

  workExperiences.forEach(({ companyName, id, memberSlackId, title }) => {
    const reviewURL = new URL(
      '/profile/work/' + id + '/review/add',
      ENV.STUDENT_PROFILE_URL
    );

    const message = dedent`
      Congratulations on completing your role as *${title}* at *${companyName}*! 🎉

      Your ColorStack peers would love to hear about it -- please take a moment to <${reviewURL}|*share a review*>! 🗣️
    `;

    job('notification.slack.send', {
      channel: memberSlackId as string,
      message,
      workspace: 'regular',
    });
  });

  await db
    .updateTable('workExperiences')
    .set({ reviewNotificationSentAt: new Date() })
    .where(
      'id',
      'in',
      workExperiences.map(({ id }) => id)
    )
    .execute();

  return {
    notificationsSent: workExperiences.length,
  };
}
