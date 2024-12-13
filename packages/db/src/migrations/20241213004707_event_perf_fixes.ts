import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createIndex('event_attendees_event_id_idx')
    .on('event_attendees')
    .column('event_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropIndex('event_attendees_event_id_idx').execute();
}
