import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function onSlackProfilePictureChanged({
  profilePicture,
  slackId,
}: GetBullJobData<'slack.profile_picture.changed'>) {
  const student = await db
    .selectFrom('students')
    .select(['id', 'profilePicture'])
    .where('slackId', '=', slackId)
    .executeTakeFirst();

  if (!student) {
    return;
  }

  if (profilePicture === student.profilePicture) {
    return;
  }

  await db
    .updateTable('students')
    .set({ profilePicture })
    .where('id', '=', student.id)
    .execute();

  if (!student.profilePicture && profilePicture) {
    job('gamification.activity.completed', {
      studentId: student.id,
      type: 'upload_profile_picture',
    });
  }
}
