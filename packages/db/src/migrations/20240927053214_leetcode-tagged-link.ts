import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .addColumn('leetcode_tagged_slug', 'varchar')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .dropColumn('leetcode_tagged_slug')
    .execute();
}
