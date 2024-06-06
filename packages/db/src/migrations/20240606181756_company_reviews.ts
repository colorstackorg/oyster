import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('company_reviews')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
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
    .addColumn('student_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addColumn('text', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('work_experience_id', 'text', (column) => {
      return column.notNull().references('work_experiences.id');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('company_reviews').execute();
}
