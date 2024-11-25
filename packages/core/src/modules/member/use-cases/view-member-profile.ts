import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';

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
