import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('company_review_upvotes')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('company_review_id', 'text', (column) => {
      return column.notNull().references('company_reviews.id');
    })
    .addColumn('student_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addPrimaryKeyConstraint('company_review_upvotes_pkey', [
      'company_review_id',
      'student_id',
    ])
    .execute();

  await db.schema
    .createIndex('company_review_upvotes_company_review_id_idx')
    .on('company_review_upvotes')
    .column('company_review_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .dropIndex('company_review_upvotes_company_review_id_idx')
    .execute();

  await db.schema.dropTable('company_review_upvotes').execute();
}
