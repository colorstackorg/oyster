import { z } from 'zod';

import { Entity, Student } from '@oyster/types';

// Schemas

export const IcebreakerPrompt = z.object({
  deletedAt: Entity.shape.deletedAt,
  id: Entity.shape.id,
  text: z.string().trim().min(1),
});

export const IcebreakerResponse = z.object({
  id: Entity.shape.id,
  promptId: IcebreakerPrompt.shape.id,
  respondedAt: z.coerce.date(),
  studentId: Student.shape.id,
  text: z.string().trim().min(1).max(280),
});

export const AddIcebreakerPromptInput = IcebreakerPrompt.pick({
  text: true,
});

// Types

export type AddIcebreakerPromptInput = z.infer<typeof AddIcebreakerPromptInput>;
export type IcebreakerPrompt = z.infer<typeof IcebreakerPrompt>;
export type IcebreakerResponse = z.infer<typeof IcebreakerResponse>;
