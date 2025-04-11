import { slack } from '@/modules/slack/instances';

/**
 * Returns a deep link to the ColorStack Slack Bot.
 *
 * @example slack://user?team=T1234567890&id=U1234567890
 * @see https://api.slack.com/reference/deep-linking#open_a_direct_message
 */
export async function getColorStackBotDeepLink() {
  const { team_id, user_id } = await slack.auth.test();

  return `slack://user?team=${team_id}&id=${user_id}`;
}
