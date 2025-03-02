import { z } from 'zod';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

const Chapter = z.object({
  id: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
});

type Chapter = z.infer<typeof Chapter>;

// Create Chapter

export async function createChapter({ schoolId }: Pick<Chapter, 'schoolId'>) {
  const chapterId = id();

  const chapter = await db
    .insertInto('chapters')
    .values({ id: chapterId, schoolId })
    .returning('id')
    .executeTakeFirstOrThrow();

  return chapter;
}
