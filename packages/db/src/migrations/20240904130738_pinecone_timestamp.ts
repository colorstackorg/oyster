import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('slack_messages')
    .addColumn('pinecone_last_updated_at', 'timestamptz')
    .execute();

  await db
    .updateTable('slack_messages')
    .set({ pineconeLastUpdatedAt: new Date() })
    .where('pineconeLastUpdatedAt', 'is', null)
    .where('createdAt', '<', new Date('2024-08-30'))
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('slack_messages')
    .dropColumn('pinecone_last_updated_at')
    .execute();
}
