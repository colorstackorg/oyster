import { db } from '../core.server';

export async function addLink(id: string, link: string) {
  await db
    .updateTable('events')
    .set({ eventLink: link })
    .where('id', '=', id)
    .executeTakeFirst();
}
