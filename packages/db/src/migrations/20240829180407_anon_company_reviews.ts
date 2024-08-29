import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('company_reviews')
    .addColumn('anonymous', 'boolean', (column) => {
      return column.defaultTo(false).notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('company_reviews')
    .dropColumn('anonymous')
    .execute();
}
