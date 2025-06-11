import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('linkedin_synced_at', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .dropColumn('linkedin_synced_at')
    .execute();
}
