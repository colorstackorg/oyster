import { db } from '@oyster/db';

export async function listResumeBooks() {
  const resumeBooks = await db
    .selectFrom('resumeBooks')
    .select([
      'airtableBaseId',
      'airtableTableId',
      'endDate',
      'id',
      'name',
      'startDate',

      (eb) => {
        return eb
          .selectFrom('resumeBookSubmissions')
          .select((eb) => eb.fn.countAll().as('submissions'))
          .whereRef('resumeBooks.id', '=', 'resumeBookSubmissions.resumeBookId')
          .as('submissions');
      },
    ])
    .orderBy('startDate', 'desc')
    .orderBy('endDate', 'desc')
    .execute();

  return resumeBooks;
}
