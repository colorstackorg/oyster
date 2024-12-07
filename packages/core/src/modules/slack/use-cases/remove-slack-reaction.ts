import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';

export async function removeSlackReaction({
  channelId,
  messageId,
  reaction,
  userId,
}: GetBullJobData<'slack.reaction.remove'>) {
  await db
    .deleteFrom('slackReactions')
    .where('channelId', '=', channelId)
    .where('messageId', '=', messageId)
    .where('reaction', '=', reaction)
    .where('userId', '=', userId)
    .execute();

  const student = await db
    .selectFrom('students')
    .select(['id'])
    .where('slackId', '=', userId)
    .executeTakeFirst();

  if (!student) {
    return;
  }

  job('gamification.activity.completed.undo', {
    channelId,
    messageReactedTo: messageId,
    studentId: student.id,
    type: 'react_to_message',
  });
}
