import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('company_reviews_upvotes')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('company_review_id', 'text', (column) => {
      return column.notNull().references('company_reviews.id');
    })
    .addColumn('student_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addPrimaryKeyConstraint('company_reviews_upvotes_pkey', [
      'company_review_id',
      'student_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('company_reviews_upvotes').execute();
}
