import { db } from '@oyster/db';

export async function getResumeBook() {
  const resumeBook = await db
    .selectFrom('resumeBooks')
    .select(['id', 'name'])
    .executeTakeFirst();

  return resumeBook;
}
