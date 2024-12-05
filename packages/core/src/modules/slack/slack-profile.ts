import { db, type DB } from '@oyster/db';

import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';
import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const SLACK_MEMBER_DIRECTORY_FIELD_ID = process.env
  .SLACK_MEMBER_DIRECTORY_FIELD_ID as string;

// Core

/**
 * @see https://api.slack.com/apis/rate-limits#tier_t3
 */
const updateProfileRateLimiter = new RateLimiter('slack:profile:update', {
  rateLimit: 50,
  rateLimitWindow: 60,
});

export async function addDirectoryLinkToSlackProfiles() {
  const members = await db
    .selectFrom('students')
    .select(['email', 'id', 'slackId'])
    .where('slackId', 'is not', null)
    .orderBy('createdAt', 'desc')
    .execute();

  console.log(`Found ${members.length} members to update.`);

  for (const member of members) {
    console.log('Updating Slack profile...', member.email);

    try {
      await addDirectoryLinkToSlackProfile(member);
      console.count('Updated Slack profile!');
    } catch (e) {
      console.count('Failed to update Slack profile.');
      reportException(e);
    }
  }
}

/**
 * Adds a member's Member Directory profile link to their Slack profile. Throws
 * an error if the profile update fails.
 *
 * @param member - The member whose Slack profile we'll update.
 */
export async function addDirectoryLinkToSlackProfile(
  member: Pick<DB['students'], 'id' | 'slackId'>
) {
  await updateProfileRateLimiter.process();

  const profile = {
    fields: {
      [SLACK_MEMBER_DIRECTORY_FIELD_ID]: {
        value: new URL(`/directory/${member.id}`, ENV.STUDENT_PROFILE_URL),
      },
    },
  };

  await slack.users.profile.set({
    profile: JSON.stringify(profile),
    token: ENV.SLACK_ADMIN_TOKEN,
    user: member.slackId as string,
  });
}
