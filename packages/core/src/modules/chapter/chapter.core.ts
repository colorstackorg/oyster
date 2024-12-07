import { db } from '@oyster/db';

import { type CreateChapterInput } from '@/modules/chapter/chapter.types';

// Add chapter
export async function createChapter({ schoolId }: CreateChapterInput) {
  await db.insertInto('chapters').values({ schoolId }).execute();
}
