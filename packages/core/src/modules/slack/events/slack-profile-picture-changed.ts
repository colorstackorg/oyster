import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { uploadProfilePicture } from '@/modules/members/use-cases/upload-profile-picture';

export async function onSlackProfilePictureChanged({
  profilePicture,
  slackId,
}: GetBullJobData<'slack.profile_picture.changed'>) {
  if (!profilePicture) {
    return;
  }

  const member = await db
    .selectFrom('students')
    .select(['id', 'profilePicture'])
    .where('slackId', '=', slackId)
    .executeTakeFirst();

  if (!member) {
    return;
  }

  const updatedMember = await uploadProfilePicture({
    memberId: member.id,
    pictureUrl: profilePicture,
  });

  if (!member.profilePicture && updatedMember?.profilePicture) {
    job('gamification.activity.completed', {
      studentId: member.id,
      type: 'upload_profile_picture',
    });
  }
}
