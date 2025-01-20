import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
  .createTable('leetcode_tags')
  .addColumn('slack_id', 'text', (column) => column.primaryKey())
  .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('leetcode_tags').execute();
}
