import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('full_time_job_offers')
    .dropConstraint('full_time_job_offers_slack_message_key')
    .execute();

  await db.schema
    .alterTable('internship_job_offers')
    .dropConstraint('internship_job_offers_slack_message_key')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('internship_job_offers')
    .addUniqueConstraint('internship_job_offers_slack_message_key', [
      'slack_channel_id',
      'slack_message_id',
    ])
    .execute();

  await db.schema
    .alterTable('full_time_job_offers')
    .addUniqueConstraint('full_time_job_offers_slack_message_key', [
      'slack_channel_id',
      'slack_message_id',
    ])
    .execute();
}
