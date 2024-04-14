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
    .addColumn('year', 'integer', (column) => {
      return column.notNull();
    })
    .addPrimaryKeyConstraint('census_responses_pkey', ['student_id', 'year'])
    .execute();

  await db.schema
    .alterTable('students')
    .addColumn('type', 'text', (column) => {
      return column.notNull().defaultTo('student');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('students').dropColumn('type').execute();
  await db.schema.dropTable('census_responses').execute();
}
