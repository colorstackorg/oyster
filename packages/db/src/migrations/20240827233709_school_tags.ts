import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('schools')
    .addColumn('tags', sql`text[]`)
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('schools').dropColumn('tags').execute();
}
