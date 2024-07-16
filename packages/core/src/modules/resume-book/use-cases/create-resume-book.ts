import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { type CreateResumeBookInput } from '../resume-book.types';

export async function createResumeBook(input: CreateResumeBookInput) {
  await db.transaction().execute(async (trx) => {
    const resumeBookId = id();

    await trx
      .insertInto('resumeBooks')
      .values({
        airtableBaseId: input.airtableBaseId,
        airtableTableId: input.airtableTableId,
        endDate: input.endDate,
        id: resumeBookId,
        name: input.name,
        startDate: input.startDate,
      })
      .execute();

    await trx
      .insertInto('resumeBookSponsors')
      .values(
        input.sponsors.map((sponsor) => {
          return {
            companyId: sponsor,
            resumeBookId,
          };
        })
      )
      .execute();
  });
}
