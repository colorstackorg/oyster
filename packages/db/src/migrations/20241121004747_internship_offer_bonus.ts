import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('internship_job_offers')
    .dropColumn('sign_on_bonus')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('internship_job_offers')
    .addColumn('sign_on_bonus', 'decimal(10, 2)')
    .execute();
}
