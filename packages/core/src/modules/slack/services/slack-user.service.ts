import { generatePath } from '@remix-run/react';

import { db } from '@oyster/db';

import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';
import { RateLimiter } from '@/shared/utils/rate-limiter';

/**
 * @see https://api.slack.com/methods/users.lookupByEmail
 */
export async function getSlackUserByEmail(email: string) {
  try {
    const { user } = await slack.users.lookupByEmail({
      email,
    });

    if (!user || !user.profile) {
      return null;
    }

    const result = {
      email: user.profile.email!,
      id: user.id!,
    };

    return result;
  } catch (e) {
    return null;
  }
}

/**
 * @see https://api.slack.com/methods/users.profile.set
 */
export async function updateSlackEmail(id: string, email: string) {
  await slack.users.profile.set({
    profile: JSON.stringify({ email }),
    token: ENV.SLACK_ADMIN_TOKEN,
    user: id,
  });
}

/**
 * Retrieve all members with both Slack and Member Directory Profiles
 */

export async function getMembersWithSlackAndDirectoryProfiles() {
  try {
    const members = await db
      .selectFrom('students')
      .select(['id', 'email', 'joinedSlackAt', 'joinedMemberDirectoryAt'])
      .where('joinedSlackAt', 'is not', null)
      .where('joinedMemberDirectoryAt', 'is not', null)
      .execute();

    return members;
  } catch (error) {
    console.error('Failed to retrieve members with profiles', error);

    return [];
  }
}

/**
 * @see https://api.slack.com/apis/rate-limits#tier_t3
 */
const updateProfileRateLimiter = new RateLimiter('slack:profile:update', {
  rateLimit: 50,
  rateLimitWindow: 60,
});

export async function addMemberDirectoryURLToSlackProfile(
  slackUserId: string,
  memberId: string
) {
  try {
    await updateProfileRateLimiter.process();

    const memberDirectoryURL = generatePath(ENV.MEMBER_DIRECTORY_URL, {
      id: memberId,
    });

    const profile = {
      fields: {
        [ENV.SLACK_MEMBER_DIRECTORY_FIELD_ID]: {
          value: memberDirectoryURL,
          alt: 'Member Directory Profile',
        },
      },
    };

    await slack.users.profile.set({
      profile: JSON.stringify(profile),
      token: ENV.SLACK_ADMIN_TOKEN,
      user: slackUserId,
    });

    console.log(`Successfully updated Slack Profile ${slackUserId}`);
  } catch (error) {
    console.error(`Failed To Update Slack Profile ${slackUserId}`, error);
  }
}

export async function updateSlackProfilesWithMemberDirectoryURLs() {
  const members = await getMembersWithSlackAndDirectoryProfiles();

  console.log(`Found ${members.length} members to update`);

  for (const member of members) {
    const { id, email } = member;

    const slackUser = await getSlackUserByEmail(email);

    if (slackUser) {
      await addMemberDirectoryURLToSlackProfile(slackUser.id, id);
    } else {
      console.log(`No Slack User Found for email: ${email}`);
    }
  }
}
