import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('resume_books')
    .addColumn('airtable_base_id', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('airtable_table_id', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('end_date', 'timestamptz', (column) => {
      return column.notNull();
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('name', 'text', (column) => {
      return column.notNull().unique();
    })
    .addColumn('start_date', 'timestamptz', (column) => {
      return column.notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('resume_books').execute();
}
