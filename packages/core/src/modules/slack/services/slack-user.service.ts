import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';
import { db } from '@oyster/db';
import {generatePath} from '@remix-run/react'; 


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
    const members = await db
    .selectFrom('students')
    .select(['id','email','joinedSlackAt','joinedMemberDirectoryAt'])
    .where('joinedSlackAt', 'is not', null)
    .where('joinedMemberDirectoryAt', 'is not', null)
    .execute();

    return members

}

export async function setMemberProfileToSlackUserProfile(id: string, memberDirectoryURL: string) {
    try {
      const profile = {
        fields: {
          X123: {
            value: memberDirectoryURL,
            alt: 'Member Profile',
          }
        }
      }

      await slack.users.profile.set({
        profile: JSON.stringify(profile), 
        token: ENV.SLACK_ADMIN_TOKEN,
        user: id,
      })

      console.log('SuccessFully updated Slack Profile')
    } catch (error) {
      console.error('Failed To Update Slack Profile')
    }
}

