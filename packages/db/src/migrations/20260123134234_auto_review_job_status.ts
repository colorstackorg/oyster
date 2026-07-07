import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .addColumn('auto_review_job_status', 'text')
    .execute();

  // Set all existing applications to DONE
  await db
    .updateTable('applications')
    .set({ auto_review_job_status: 'DONE' })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .dropColumn('auto_review_job_status')
    .execute();
}
