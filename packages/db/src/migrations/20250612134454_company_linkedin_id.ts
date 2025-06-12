import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .addColumn('linkedin_id', 'text', (column) => {
      return column.unique();
    })
    .addColumn('linkedin_slug', 'text', (column) => {
      return column.unique();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .dropColumn('linkedin_id')
    .dropColumn('linkedin_slug')
    .execute();
}
