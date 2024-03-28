import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { AddIcebreakerPromptInput } from '../icebreaker.types';

export async function addIcebreakerPrompt(input: AddIcebreakerPromptInput) {
  await db
    .insertInto('icebreakerPrompts')
    .values({
      id: id(),
      text: input.text,
    })
    .execute();
}
