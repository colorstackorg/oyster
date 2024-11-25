import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type AddIcebreakerPromptInput } from '../icebreaker.types';

export async function addIcebreakerPrompt(input: AddIcebreakerPromptInput) {
  await db
    .insertInto('icebreakerPrompts')
    .values({
      id: id(),
      text: input.text,
    })
    .execute();
}
