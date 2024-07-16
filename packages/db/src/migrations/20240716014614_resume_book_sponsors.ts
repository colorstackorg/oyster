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

  await db.schema
    .alterTable('resume_book_submissions')
    .addColumn('preferred_company_1', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('preferred_company_2', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('preferred_company_3', 'text', (column) => {
      return column.notNull();
    })
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .addForeignKeyConstraint(
      'preferred_company_1_fkey',
      ['preferred_company_1', 'resume_book_id'],
      'resume_book_sponsors',
      ['company_id', 'resume_book_id']
    )
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .addForeignKeyConstraint(
      'preferred_company_2_fkey',
      ['preferred_company_2', 'resume_book_id'],
      'resume_book_sponsors',
      ['company_id', 'resume_book_id']
    )
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .addForeignKeyConstraint(
      'preferred_company_3_fkey',
      ['preferred_company_3', 'resume_book_id'],
      'resume_book_sponsors',
      ['company_id', 'resume_book_id']
    )
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_book_submissions')
    .dropConstraint('preferred_company_3_fkey')
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .dropConstraint('preferred_company_2_fkey')
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .dropConstraint('preferred_company_1_fkey')
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .dropColumn('preferred_company_1')
    .dropColumn('preferred_company_2')
    .dropColumn('preferred_company_3')
    .execute();

  await db.schema.dropTable('resume_book_sponsors').execute();
}
