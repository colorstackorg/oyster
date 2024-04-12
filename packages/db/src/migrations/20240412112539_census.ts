import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('census_responses')
    .addColumn('json', 'jsonb', (column) => {
      return column.notNull();
    })
    .addColumn('student_id', 'text', (column) => {
      return column.references('students.id').notNull();
    })
    .addColumn('submitted_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('updated_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('year', 'integer', (column) => {
      return column.notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('census_responses').execute();
}
