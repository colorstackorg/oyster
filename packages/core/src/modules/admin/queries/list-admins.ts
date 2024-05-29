import { db } from '@oyster/db';

export async function listAdmins() {
  const admins = await db
    .selectFrom('admins')
    .select(['firstName', 'lastName', 'email', 'isAmbassador'])
    .orderBy('createdAt', 'desc')
    .execute();

  return admins;
}
