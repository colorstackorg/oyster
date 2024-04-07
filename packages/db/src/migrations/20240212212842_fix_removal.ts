import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // event_registrations

  await db.schema
    .alterTable('event_registrations')
    .dropConstraint('event_registrations_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('event_registrations')
    .addForeignKeyConstraint(
      'event_registrations_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  // icebreaker_responses

  await db.schema
    .alterTable('icebreaker_responses')
    .dropConstraint('icebreaker_responses_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('icebreaker_responses')
    .addForeignKeyConstraint(
      'icebreaker_responses_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  // member_ethnicities

  await db.schema
    .alterTable('member_ethnicities')
    .dropConstraint('member_ethnicities_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('member_ethnicities')
    .addForeignKeyConstraint(
      'member_ethnicities_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  // profile_views

  await db.schema
    .alterTable('profile_views')
    .dropConstraint('profile_views_profile_viewed_id_fkey')
    .execute();

  await db.schema
    .alterTable('profile_views')
    .dropConstraint('profile_views_viewer_id_fkey')
    .execute();

  await db.schema
    .alterTable('profile_views')
    .addForeignKeyConstraint(
      'profile_views_profile_viewed_id_fkey',
      ['profile_viewed_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('profile_views')
    .addForeignKeyConstraint(
      'profile_views_viewer_id_fkey',
      ['viewer_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();
}

export async function down(_: Kysely<any>) {}
