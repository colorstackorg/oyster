import { generatePath } from '@remix-run/react';

import { db } from '@oyster/db';

import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';

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

export async function getMembersWithProfilesandSlack() {
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

export async function setMemberProfileToSlackUserProfile(
  id: string,
  memberDirectoryURL: string
) {
  try {
    const profile = {
      fields: {
        X123: {
          // unsure of what the field ID is called is it created?
          value: memberDirectoryURL,
          alt: '',
        },
      },
    };

    await slack.users.profile.set({
      profile: JSON.stringify(profile),
      token: ENV.SLACK_ADMIN_TOKEN,
      user: id,
    });

    console.log(`SuccessFully updated Slack Profile${id}`);
  } catch (error) {
    console.error(`Failed To Update Slack Profile ${id}`, error);
  }
}

export async function updateSlackProfilesWithMemberURLS() {
  const members = await getMembersWithProfilesandSlack();

  for (const member of members) {
    const { id, email } = member;

    const slackUser = await getSlackUserByEmail(email);

    if (slackUser && slackUser.id) {
      const baseURL = 'https://app.colorstack.io';
      const memberDirectoryURL = `${baseURL}${generatePath(`/directory/:id`, { id })}`;

      await setMemberProfileToSlackUserProfile(
        slackUser.id,
        memberDirectoryURL
      );

      console.log(
        `Successfully updated Slack profile for user ${slackUser.id}`
      );
    } else {
      console.log(`No Slack User Found for email: ${email}`);
    }

    await delay(10000);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
