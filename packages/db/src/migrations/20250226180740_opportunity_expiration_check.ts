import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .addColumn('last_expiration_check', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .dropColumn('last_expiration_check')
    .execute();
}
