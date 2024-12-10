import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull.types';
import { getMemberByEmail } from '@/modules/members/queries/get-member-by-email';
import { addDirectoryLinkToSlackProfile } from '@/modules/slack/slack-profile';
import { NotFoundError } from '@/shared/errors';

export async function onSlackWorkspaceJoined({
  email,
  slackId,
}: GetBullJobData<'slack.joined'>) {
  const member = await getMemberByEmail(email);

  if (!member) {
    throw new NotFoundError(
      'Could not find member who joined Slack.'
    ).withContext({
      email,
      slackId,
    });
  }

  await db
    .updateTable('students')
    .set({
      joinedSlackAt: new Date(),
      slackId,
    })
    .where('id', '=', member.id)
    .execute();

  await addDirectoryLinkToSlackProfile({
    id: member.id,
    slackId,
  });
}
