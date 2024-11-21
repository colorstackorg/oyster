import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('full_time_job_offers')
    .renameTo('full_time_offers')
    .execute();

  await db.schema
    .alterTable('internship_job_offers')
    .renameTo('internship_offers')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('full_time_offers')
    .renameTo('full_time_job_offers')
    .execute();

  await db.schema
    .alterTable('internship_offers')
    .renameTo('internship_job_offers')
    .execute();
}
