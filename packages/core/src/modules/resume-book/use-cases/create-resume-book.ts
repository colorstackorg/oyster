import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { type CreateResumeBookInput } from '../resume-book.types';

export async function createResumeBook(input: CreateResumeBookInput) {
  await db
    .insertInto('resumeBooks')
    .values({
      airtableBaseId: input.airtableBaseId,
      airtableTableId: input.airtableTableId,
      endDate: input.endDate,
      id: id(),
      name: input.name,
      startDate: input.startDate,
    })
    .execute();
}
