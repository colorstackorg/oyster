import { type Kysely } from 'kysely';

// After this migration executes, we should backfill columns that were added and
// then update the columns to be not null.
export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_books')
    .addColumn('google_drive_folder_id', 'text')
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .addColumn('google_drive_file_id', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_books')
    .dropColumn('google_drive_folder_id')
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .dropColumn('google_drive_file_id')
    .execute();
}
