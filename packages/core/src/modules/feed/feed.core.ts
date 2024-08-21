import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import dedent from 'dedent';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { run } from '@oyster/utils';

import {
  FeedBullJob,
  type GetBullJobData,
} from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { ENV } from '@/shared/env';

// Environment Variables

const SLACK_FEED_CHANNEL_ID = process.env.SLACK_FEED_CHANNEL_ID || '';

// Worker

export const feedWorker = registerWorker('feed', FeedBullJob, async (job) => {
  return match(job)
    .with({ name: 'feed.slack.recurring' }, ({ data }) => {
      return sendFeedSlackNotification(data);
    })
    .exhaustive();
});

dayjs.extend(dayOfYear);

/**
 * Sends a Slack notification to our "feed" channel on a daily basis. It serves
 * as a "digest" of things that happened the day before, particularly in the
 * Member Profile.
 *
 * For now, we're only including resources that were posted in the Resource
 * Database. In the future, we'll expand this to include other things like
 * company reviews, new members in the directory, etc.
 */
async function sendFeedSlackNotification(
  _: GetBullJobData<'feed.slack.recurring'>
) {
  // We're filtering for things that happened yesterday -- we'll use the PT
  // timezone so that everyone is on the same page.
  const yesterday = dayjs().tz('America/Los_Angeles').subtract(1, 'day');

  const startOfYesterday = yesterday.startOf('day').toDate();
  const endOfYesterday = yesterday.endOf('day').toDate();

  const resources = await db
    .selectFrom('resources')
    .leftJoin('students', 'students.id', 'resources.postedBy')
    .select([
      'resources.id',
      'resources.title',
      'students.slackId as posterSlackId',
    ])
    .where('resources.postedAt', '>=', startOfYesterday)
    .where('resources.postedAt', '<=', endOfYesterday)
    .execute();

  if (!resources.length) {
    return;
  }

  const message = run(() => {
    const resourceItems = resources
      .map((resource) => {
        const url = new URL('/resources', ENV.STUDENT_PROFILE_URL);

        // Example: https://app.colorstack.io/resources?id=123
        url.searchParams.set('id', resource.id);

        return `• <${url}|*${resource.title}*> by <@${resource.posterSlackId}>`;
      })
      .join('\n');

    const url = new URL('/resources', ENV.STUDENT_PROFILE_URL);

    // Example: https://app.colorstack.io/resources?date=2024-08-15
    url.searchParams.set('date', yesterday.format('YYYY-MM-DD'));

    const dayOfTheWeek = dayjs().format('dddd');
    const dayOfTheYear = dayjs().dayOfYear();

    return dedent`
      Morning y'all, happy ${dayOfTheWeek}! ☀️

      The following <${url}|resources> were posted yesterday:

      ${resourceItems}

      Show some love for their contributions! ❤️

      #TheFeed #Day${dayOfTheYear}
    `;
  });

  job('notification.slack.send', {
    channel: SLACK_FEED_CHANNEL_ID,
    message,
    workspace: 'regular',
  });
}
