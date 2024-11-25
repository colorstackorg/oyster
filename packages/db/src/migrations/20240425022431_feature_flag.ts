import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('feature_flags')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('description', 'text')
    .addColumn('display_name', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('enabled', 'boolean', (column) => {
      return column.notNull().defaultTo(false);
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('name', 'text', (column) => {
      return column.notNull().unique();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('feature_flags').execute();
}
