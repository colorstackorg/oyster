import { db } from '@/infrastructure/database';

/**
 * 'Removes' ColorStack admin. This will revoke the user access to the Admin
 *  Dashboard. Note that it shouldn't delete the record entirely, but it should
 *  set the deletedAt timestamp, effectively archiving the admin).
 */
export async function removeAdmin({ id }: { id: string }) {
  const admin = await db
    .updateTable('admins')
    .set({
      deletedAt: new Date(), // not sure of the format
    })
    .where('id', '=', id as string)
    .executeTakeFirst();

  if (admin) {
    return new Error('The admin does not exist.');
  }
}
