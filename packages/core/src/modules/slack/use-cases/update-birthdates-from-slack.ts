import { db } from '@oyster/db';

import { slack } from '@/modules/slack/instances';
import { RateLimiter } from '@/shared/utils/rate-limiter';

/**
 * @see https://api.slack.com/apis/rate-limits#tier_t4
 */
const getBirthdatesRateLimiter = new RateLimiter(
  'slack:connections:get_birthdates',
  {
    rateLimit: 100,
    rateLimitWindow: 60,
  }
);

/**
 * Slack has a notion of custom fields that can be set by admins of the
 * workspace, so we need the ID of that field to fetch the birthdate.
 */
const SLACK_BIRTHDATE_FIELD_ID = process.env.SLACK_BIRTHDATE_FIELD_ID as string;

export async function updateBirthdatesFromSlack() {
  const members = await db
    .selectFrom('students')
    .select(['slackId'])
    .where('birthdate', 'is', null)
    .where('slackId', 'is not', null)
    .execute();

  console.log(`${members.length} members found without a birthdate.`);

  for (const member of members) {
    await updateBirthdateBySlackId(member.slackId as string);
  }
}

/**
 * @see https://api.slack.com/methods/users.profile.get
 */
async function updateBirthdateBySlackId(slackId: string) {
  await getBirthdatesRateLimiter.process();

  const user = await slack.users.profile.get({
    user: slackId,
  });

  const birthdate = user?.profile?.fields?.[SLACK_BIRTHDATE_FIELD_ID]?.value;

  if (birthdate) {
    // We aren't wrapping this in a transaction because we want to make progress
    // since Slack API calls are relatively expensive. There's no harm done
    // in updating some records but not others because we'll just retry them.
    await db
      .updateTable('students')
      .set({ birthdate })
      .where('slackId', '=', slackId)
      .execute();
  }
}
