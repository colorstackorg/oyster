import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';
import { Member } from '@slack/web-api/dist/response/UsersListResponse';
import { Profile } from '@slack/web-api/dist/response/UsersProfileGetResponse';

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
 * @see https://api.slack.com/methods/users.list
 */
export async function getAllSlackUsers() {
  let allUsers: Member[] = [];
  let cursor; // Slack uses cursor-based pagination.

  try {
    // Continue calling the API until there's no more pages (cursor is empty).
    do {
      const response = await slack.users.list({ cursor: cursor });
      const users: Member[] | undefined = response.members;

      if (!users) {
        break;
      }

      allUsers.push(...users);

      // Slack recommends waiting for a short period of time before next pagination request
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Update cursor to the next cursor value, if any.
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    return allUsers;
  } catch (e) {
    console.error('Failed to fetch all Slack users:', e);
    return null;
  }
}

export async function getUserProfile(user: Member) {
  let userId = user.id;
  try {
    // Continue calling the API until there's no more pages (cursor is empty).
    const response = await slack.users.profile.get({ id: userId });
    const userProfile: Profile | undefined = response.profile;

    return userProfile;
  } catch (e) {
    console.error(
      'Failed to fetch all User Profile for userId= %d:',
      userId,
      e
    );
    return null;
  }
}
