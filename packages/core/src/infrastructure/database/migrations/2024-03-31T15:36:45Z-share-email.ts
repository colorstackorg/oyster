import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('share_email', 'boolean')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('students').dropColumn('share_email').execute();
}
