import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('event_attendees')
    .dropConstraint('UQ_9d32xlhph8j7')
    .execute();

  await db.schema
    .alterTable('event_attendees')
    .addUniqueConstraint('event_attendees_event_id_student_id_key', [
      'event_id',
      'student_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('event_attendees')
    .dropConstraint('event_attendees_event_id_student_id_key')
    .execute();

  await db.schema
    .alterTable('event_attendees')
    .addUniqueConstraint('UQ_9d32xlhph8j7', ['student_id', 'event_id'])
    .execute();
}
