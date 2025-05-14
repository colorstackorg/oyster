import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createIndex('event_attendees_event_id_idx')
    .on('event_attendees')
    .column('event_id')
    .execute();

  await db.schema
    .createIndex('event_registrations_event_id_idx')
    .on('event_registrations')
    .column('event_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropIndex('event_registrations_event_id_idx').execute();
  await db.schema.dropIndex('event_attendees_event_id_idx').execute();
}
