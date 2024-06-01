import { db } from '@/infrastructure/database';
import { slack } from '@/modules/slack/instances';
import { RateLimiter } from '@/shared/utils/rate-limiter';

const getBirthdatesRateLimiter = new RateLimiter(
  'slack:connections:get_birthdates',
  {
    rateLimit: 100,
    rateLimitWindow: 60,
  }
);

export async function updateBirthdatesfromSlack() {
  const members = await db
    .selectFrom('students')
    .select(['slackId'])
    .where('slackId', 'is not', null)
    .execute();

  for (const member of members) {
    await updateBirthdatebySlackId(member.slackId!);
  }
}

async function updateBirthdatebySlackId(slackId: string) {
  await getBirthdatesRateLimiter.process();

  const user = await slack.users.profile.get({ user: slackId });

  const birthdateFieldId = '[placeholder for the birthdate id]';

  const birthdate = user?.profile?.fields?.[birthdateFieldId]?.value;

  if (birthdate) {
    await db
      .updateTable('students')
      .set({ birthdate })
      .where('slackId', '=', slackId)
      .execute();
  }
}
