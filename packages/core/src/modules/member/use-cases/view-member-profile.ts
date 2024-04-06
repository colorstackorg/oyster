import { id } from '@oyster/utils';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

export async function viewMemberProfile({
  profileViewedId,
  viewerId,
}: GetBullJobData<'student.profile.viewed'>) {
  await db
    .insertInto('profileViews')
    .values({
      id: id(),
      profileViewedId,
      viewerId,
    })
    .execute();
}
