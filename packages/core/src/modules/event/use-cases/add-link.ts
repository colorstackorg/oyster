import { db } from '@/infrastructure/database';

export async function addLink(id: string, link: string) {
  await db
    .updateTable('events')
    .set({ recordingLink: link })
    .where('id', '=', id)
    .executeTakeFirst();
}
