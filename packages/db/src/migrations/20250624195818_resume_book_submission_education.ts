import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_book_submissions')
    .alterColumn('education_id', (column) => {
      return column.dropNotNull();
    })
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .dropConstraint('resume_book_submissions_education_id_fkey')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .addForeignKeyConstraint(
      'resume_book_submissions_education_id_fkey',
      ['education_id'],
      'educations',
      ['id']
    )
    .onDelete('set null')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_book_submissions')
    .dropConstraint('resume_book_submissions_education_id_fkey')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .addForeignKeyConstraint(
      'resume_book_submissions_education_id_fkey',
      ['education_id'],
      'educations',
      ['id']
    )
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .alterColumn('education_id', (column) => {
      return column.setNotNull();
    })
    .execute();
}
