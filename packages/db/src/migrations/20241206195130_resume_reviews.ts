import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('resume_reviews')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('feedback', 'jsonb', (column) => {
      return column.notNull();
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('member_id', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('resume_reviews').execute();
}
