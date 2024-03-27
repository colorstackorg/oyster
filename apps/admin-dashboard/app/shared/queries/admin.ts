import { db } from '../core.server';

export async function isAmbassador(adminId: string) {
  const admin = await db
    .selectFrom('admins')
    .select(['isAmbassador'])
    .where('id', '=', adminId)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  if (!admin) {
    return false;
  }

  return admin.isAmbassador;
}
