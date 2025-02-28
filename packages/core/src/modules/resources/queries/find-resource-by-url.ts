import { db } from '@oyster/db';

export async function findResourceByUrl(url: string) {
  return db
    .selectFrom('resources')
    .where('link', '=', url)
    .selectAll()
    .executeTakeFirst();
}
