import { z } from 'zod';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

const Chapter = z.object({
  id: z.string().trim().min(1),
  schoolId: z.string().trim().min(1),
});

// Create Chapter

export const CreateChapterInput = Chapter.pick({
  schoolId: true,
});

export type CreateChapterInput = z.infer<typeof CreateChapterInput>;

export async function createChapter({ schoolId }: CreateChapterInput) {
  const chapterId = id();

  const chapter = await db
    .insertInto('chapters')
    .values({ id: chapterId, schoolId })
    .returning('id')
    .executeTakeFirstOrThrow();

  return chapter;
}
