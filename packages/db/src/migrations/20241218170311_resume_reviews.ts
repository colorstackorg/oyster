import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_reviews')
    .addColumn('resume_text', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_reviews')
    .dropColumn('resume_text')
    .execute();
}
