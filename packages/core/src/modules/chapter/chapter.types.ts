import { z } from 'zod';

import { Entity } from '@oyster/types';

// schema

export const Chapter = Entity.extend({
  createdAt: z.date(),
  schoolId: z.string(),
});

// Use Cases

export const CreateChapterInput = Chapter.pick({
  schoolId: true,
});

//Types

export type CreateChapterInput = z.infer<typeof CreateChapterInput>;
