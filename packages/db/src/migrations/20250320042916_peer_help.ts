import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('help_requests')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('description', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('helpee_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addColumn('helper_id', 'text', (column) => {
      return column.references('students.id');
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('status', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('summary', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('type', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('updated_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('help_requests').execute();
}
