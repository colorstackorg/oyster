import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('feature_flags')
    .addColumn('code', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('description', 'text')
    .addColumn('enabled', 'boolean', (column) => {
      return column.notNull().defaultTo(false);
    })
    .addColumn('name', 'text', (column) => {
      return column.notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('feature_flags').execute();
}
