import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('feature_flags')
    .addColumn('code', 'text', (column) => {
      return column.notNull().unique();
    })
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('description', 'text')
    .addColumn('enabled', 'boolean', (column) => {
      return column.notNull().defaultTo(false);
    })
    .addColumn('id', 'serial', (column) => {
      return column.primaryKey();
    })
    .addColumn('name', 'text', (column) => {
      return column.notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('feature_flags').execute();
}
