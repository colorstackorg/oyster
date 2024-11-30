import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .addUniqueConstraint('opportunities_slack_message_key', [
      'slack_channel_id',
      'slack_message_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .dropConstraint('opportunities_slack_message_key')
    .execute();
}
