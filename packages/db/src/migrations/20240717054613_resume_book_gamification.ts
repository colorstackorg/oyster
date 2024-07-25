import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .addColumn('resume_book_id', 'text', (column) => {
      return column.references('resume_books.id');
    })
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addUniqueConstraint('completed_activities_submit_resume_key', [
      'resume_book_id',
      'student_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .dropConstraint('completed_activities_submit_resume_key')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropColumn('resume_book_id')
    .execute();
}
