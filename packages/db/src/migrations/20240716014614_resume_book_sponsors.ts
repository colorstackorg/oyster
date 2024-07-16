import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('resume_book_sponsors')
    .addColumn('company_id', 'text', (column) => {
      return column.notNull().references('companies.id');
    })
    .addColumn('resume_book_id', 'text', (column) => {
      return column.notNull().references('resume_books.id');
    })
    .addPrimaryKeyConstraint('resume_book_sponsors_pkey', [
      'company_id',
      'resume_book_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('resume_book_sponsors').execute();
}
