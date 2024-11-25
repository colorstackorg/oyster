import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .addColumn('refined_at', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .dropColumn('refined_at')
    .execute();
}
