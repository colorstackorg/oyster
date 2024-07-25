import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_books')
    .alterColumn('google_drive_folder_id', (column) => {
      return column.setNotNull();
    })
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .alterColumn('google_drive_file_id', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_books')
    .alterColumn('google_drive_folder_id', (column) => {
      return column.dropNotNull();
    })
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .alterColumn('google_drive_file_id', (column) => {
      return column.dropNotNull();
    })
    .execute();
}
