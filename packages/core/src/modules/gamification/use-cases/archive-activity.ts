import { db } from '@/infrastructure/database';

export async function archiveActivity(id: string) {
  await db
    .updateTable('activities')
    .set({ deletedAt: new Date() })
    .where('id', '=', id)
    .executeTakeFirst();
}
