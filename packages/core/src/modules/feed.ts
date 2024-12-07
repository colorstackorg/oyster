import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import dedent from 'dedent';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';

import { job, registerWorker } from '@/infrastructure/bull';
import { FeedBullJob, type GetBullJobData } from '@/infrastructure/bull.types';
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

// Send Feed Slack Notification

dayjs.extend(dayOfYear);

/**
 * Sends a Slack notification to our "feed" channel on a daily basis. It serves
 * as a "digest" of things that happened the day before, particularly in the
 * Member Profile.
 *
 * For now, this includes resources, members that joined the directory, and
 * company reviews. The scope of this will likely expand as we introduce more
 * tools in the Member Profile.
 */
async function sendFeedSlackNotification(
  _: GetBullJobData<'feed.slack.recurring'>
) {
  const [companyReviewsMessage, membersMessage, resourcesMessage] =
    await Promise.all([
      getCompanyReviewsMessage(),
      getMembersMessage(),
      getResourcesMessage(),
    ]);

  const messages = [
    membersMessage,
    resourcesMessage,
    companyReviewsMessage,
  ].filter(Boolean);

  if (!messages.length) {
    return;
  }

  const dayOfTheWeek = dayjs().tz('America/Los_Angeles').format('dddd');

  const message = dedent`
    Morning y'all, happy ${dayOfTheWeek}! ☀️

    ${messages.join('\n\n')}

    Show some love for their engagement! ❤️
  `;

  job('notification.slack.send', {
    channel: SLACK_FEED_CHANNEL_ID,
    message,
    workspace: 'regular',
  });
}

async function getCompanyReviewsMessage(): Promise<string | null> {
  const { endOfYesterday, startOfYesterday } = getYesterdayRange();

  const companyReviews = await db
    .selectFrom('companyReviews')
    .leftJoin('students', 'students.id', 'companyReviews.studentId')
    .leftJoin('workExperiences', 'workExperiences.id', 'workExperienceId')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'companies.name as companyName',
      'companyReviews.anonymous',
      'companyReviews.id',
      'companyReviews.rating',
      'students.slackId as posterSlackId',
      'workExperiences.companyId',
    ])
    .where('companyReviews.createdAt', '>=', startOfYesterday)
    .where('companyReviews.createdAt', '<=', endOfYesterday)
    .execute();

  if (!companyReviews.length) {
    return null;
  }

  const items = companyReviews
    .map(({ anonymous, companyId, companyName, posterSlackId, rating }) => {
      const url = new URL('/companies/' + companyId, ENV.STUDENT_PROFILE_URL);

      return anonymous
        ? `• <${url}|*${companyName}*> (${rating}/10) by Anonymous (🫣)`
        : `• <${url}|*${companyName}*> (${rating}/10) by <@${posterSlackId}>`;
    })
    .join('\n');

  const title =
    companyReviews.length === 1
      ? 'Check out this company review posted yesterday! 💼'
      : 'Check out these company reviews posted yesterday! 💼';

  return dedent`
    ${title}
    ${items}
  `;
}

async function getMembersMessage(): Promise<string | null> {
  const { endOfYesterday, startOfYesterday, yesterday } = getYesterdayRange();

  const members = await db
    .selectFrom('students')
    .where('joinedMemberDirectoryAt', '>=', startOfYesterday)
    .where('joinedMemberDirectoryAt', '<=', endOfYesterday)
    .execute();

  if (!members.length) {
    return null;
  }

  const url = new URL('/directory', ENV.STUDENT_PROFILE_URL);

  url.searchParams.set('joinedDirectoryDate', yesterday.format('YYYY-MM-DD'));

  const title =
    members.length === 1
      ? `Say hello to the <${url}|${members.length} member> who joined the Member Directory yesterday! 👋`
      : `Say hello to the <${url}|${members.length} members> who joined the Member Directory yesterday! 👋`;

  return dedent`
    ${title}
  `;
}

async function getResourcesMessage(): Promise<string | null> {
  const { endOfYesterday, startOfYesterday, yesterday } = getYesterdayRange();

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
    return null;
  }

  const items = resources
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

  const title =
    resources.length === 1
      ? `Check out this <${url}|resource> posted yesterday! 📚`
      : `Check out these <${url}|resources> posted yesterday! 📚`;

  return dedent`
    ${title}
    ${items}
  `;
}

/**
 * Returns the datetime for the start and end of yesterday.
 *
 * We're using the PT timezone for this, since we want to show a consistent
 * range for everyone, despite where they are.
 */
function getYesterdayRange() {
  const yesterday = dayjs().tz('America/Los_Angeles').subtract(1, 'day');

  return {
    endOfYesterday: yesterday.endOf('day').toDate(),
    startOfYesterday: yesterday.startOf('day').toDate(),
    yesterday,
  };
}
