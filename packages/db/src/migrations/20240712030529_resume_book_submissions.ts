import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('resume_book_submissions')
    .addColumn('airtable_record_id', 'text', (column) => {
      return column.notNull().unique();
    })
    .addColumn('member_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addColumn('resume_book_id', 'text', (column) => {
      return column.notNull().references('resume_books.id');
    })
    .addColumn('submitted_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addPrimaryKeyConstraint('resume_book_submissions_pkey', [
      'member_id',
      'resume_book_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('resume_book_submissions').execute();
}
