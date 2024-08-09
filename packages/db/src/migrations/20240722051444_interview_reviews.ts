import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('interview_reviews')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('interview_position', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('student_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addColumn('text', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('company_id', 'text', (column) => {
      return column.references('companies.id');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('interview_reviews').execute();
}
