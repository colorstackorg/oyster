import { db } from '@oyster/db';

export async function isMemberAdmin(memberId: string) {
  const admin = await db
    .selectFrom('admins')
    .where('memberId', '=', memberId)
    .executeTakeFirst();

  return !!admin;
}
