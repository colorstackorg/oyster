import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';
import { getSlackUserByEmail } from '@/modules/slack/services/slack-user.service';

/**
 * After the Slack user is invited to the workspace, we should update the
 * member's Slack ID in the database.
 *
 * Unfortunately, Slack doesn't return the user ID in the response when inviting
 * a user, so we'll have to fetch it from the Slack API separately. Since that
 * is more error-prone, we extract this logic into a separate job (which can
 * be retried if it fails).
 */
export async function onSlackUserInvited({
  email,
}: GetBullJobData<'slack.invited'>) {
  const user = await getSlackUserByEmail(email);

  if (!user) {
    return;
  }

  await db
    .updateTable('students')
    .set({ slackId: user.id })
    .where('email', '=', email)
    .where('slackId', 'is', null)
    .execute();
}
