import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('company_reviews')
    .addColumn('company_id', 'text', (column) => {
      return column.notNull().references('companies.id');
    })
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('employment_type', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('rating', 'smallint', (column) => {
      return column.notNull();
    })
    .addColumn('recommend', 'boolean', (column) => {
      return column.notNull();
    })
    .addColumn('text', 'text', (column) => {
      return column.notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('company_reviews').execute();
}
