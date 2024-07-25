import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_book_submissions')
    .addColumn('coding_languages', sql`text[]`, (column) => {
      return column.notNull();
    })
    .addColumn('employment_search_status', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('preferred_roles', sql`text[]`, (column) => {
      return column.notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_book_submissions')
    .dropColumn('coding_languages')
    .dropColumn('employment_search_status')
    .dropColumn('preferred_roles')
    .execute();
}
