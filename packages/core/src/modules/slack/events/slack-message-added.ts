import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onSlackMessageAdded({
  channelId,
  studentId,
  threadId,
}: GetBullJobData<'slack.message.added'>) {
  job('student.activation_requirement_completed', {
    studentId,
  });

  if (threadId) {
    job('gamification.activity.completed', {
      channelId,
      studentId,
      threadRepliedTo: threadId,
      type: 'reply_to_thread',
    });
  }
}
