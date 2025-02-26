import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .addColumn('link', 'text', (column) => {
      return column.unique();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('opportunities').dropColumn('link').execute();
}
