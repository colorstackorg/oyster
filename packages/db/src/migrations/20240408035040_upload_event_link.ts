import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('events')
    .addColumn('event_link', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('events').dropColumn('event_link').execute();
}
