import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_book_submissions')
    .addColumn('education_id', 'text', (column) => {
      return column.notNull().references('educations.id');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_book_submissions')
    .dropColumn('education_id')
    .execute();
}
