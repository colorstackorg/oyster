import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('events')
    .addColumn('preEventNotificationJobID', 'text', (col) =>
      col.defaultTo(null)
    )
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('events')
    .dropColumn('preEventNotificationJobID')
    .execute();
}
