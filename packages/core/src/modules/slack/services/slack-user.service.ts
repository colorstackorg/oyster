import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';
import { db } from '@oyster/db';
import { generatePath } from '@remix-run/react';
//import { Route } from '@/shared/constants';

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

export async function getMembersWithProfiles() {
  try {
   const members = await db
    .selectFrom('students') // Specify the table you're selecting from
    .select(['id', 'email', 'joined_slack_at', 'joined_member_directory_at'] as any)
    .where('joined_slack_at', 'is not', null)
    .where('joined_member_directory_at', 'is not', null)
    .execute();

    console.log('Retrieved members:', members);
  } catch (error) {
    console.error('Error retrieving members:', error);
  }

}
