import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('slack_messages')
    .addColumn('auto_replied_at', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('slack_messages')
    .dropColumn('auto_replied_at')
    .execute();
}
