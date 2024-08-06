import { sql } from 'kysely';

import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { ENV } from '@/shared/env';

function buildResourceMessage(
  resources: Array<{
    link: string | null;
    title: string;
    slackId: string | null;
  }>
) {
  const resourceItems = resources
    .map(
      (resource) =>
        `- [${resource.title}](${resource.link}) by <@${resource.slackId}>`
    )
    .join('\n');

  // generating url for all resources posted within 24 hours of current timestamp
  // example: /resources?postedAfter=2024-08-05T12:34:56.789Z
  const currentTimestamp = new Date().toISOString();
  const url = `/link-to-resource-database?timestamp=${encodeURIComponent(currentTimestamp)}`;

  const message = `Some new resources were posted in the Resource Database:
    ${resourceItems}
    Check out these latest resources [here](${url})!
    Show some love if any of these are helpful!`;

  return message;
}

export async function sendResourcesNotification(
  _: GetBullJobData<'student.resources.daily'>
) {
  const resources = await db
    .selectFrom('resources')
    .leftJoin('students', 'students.id', 'resources.postedBy')
    .select(['resources.link', 'resources.title', 'students.slackId'])
    .whereRef(
      'resources.postedAt',
      '>=',
      sql`CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    )
    .where('students.slackId', 'is not', null)
    .where('resources.title', 'is not', null)
    .where('resources.link', 'is not', null)
    .execute();

  if (!resources.length) {
    return;
  }

  const message = buildResourceMessage(resources);

  job('notification.slack.send', {
    channel: ENV.RESOURCES_CHANNEL_ID,
    message: `${message}`,
    workspace: 'regular',
  });
}
