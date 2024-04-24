import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('github_access_token', 'text')
    .addColumn('github_connected_at', 'timestamptz')
    .addColumn('github_id', 'integer')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .dropColumn('github_access_token')
    .dropColumn('github_connected_at')
    .dropColumn('github_id')
    .execute();
}
