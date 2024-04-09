import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('interview_experiences')
    .addColumn('id', 'text', (cb) => cb.primaryKey())
    .addColumn('student_id', 'text', (cb) => {
      return cb.references('students.id');
    })
    .addColumn('created_at', 'timestamptz', (cb) =>
      cb.notNull().defaultTo(sql`now()`)
    )
    .addColumn('position_name', 'text', (cb) => cb.notNull())
    .addColumn('position_level', 'text', (cb) => cb.notNull())
    .addColumn('start_date', 'date', (cb) => cb.notNull())
    .addColumn('end_date', 'date', (cb) => cb.notNull())
    .addColumn('company_id', 'text', (cb) => {
      return cb.references('companies.id');
    })
    .addColumn('number_of_rounds', 'integer', (cb) => cb.notNull())
    .addColumn('interview_questions', 'text', (cb) => cb.notNull())
    .addColumn('interview_review', 'text')
    .addColumn('extra_notes', 'text')
    .addColumn('updated_at', 'timestamptz', (cb) =>
      cb.notNull().defaultTo(sql`now()`)
    )
    .addColumn('interview_status', 'text', (cb) => cb.notNull())
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('interview_experiences').execute();
}
