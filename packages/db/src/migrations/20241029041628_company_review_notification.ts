import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .addColumn('review_notification_sent_at', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .dropColumn('review_notification_sent_at')
    .execute();
}
