import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('job_offers')
    .addColumn('id', 'text', (cb) => cb.primaryKey())
    .addColumn('created_at', 'timestamptz', (cb) =>
      cb.notNull().defaultTo(sql`now()`)
    )
    .addColumn('base_salary', 'integer')
    .addColumn('bonus', 'integer')
    .addColumn('company_id', 'text', (cb) => {
      return cb.references('companies.id');
    })
    .addColumn('compensation_type', 'text', (cb) => cb.notNull())
    .addColumn('employment_type', 'text', (cb) => cb.notNull())
    .addColumn('hourly_pay', 'integer')
    .addColumn('other_company', 'text')
    .addColumn('start_date', 'date', (cb) => cb.notNull())
    .addColumn('status', 'text', (cb) => cb.notNull())
    .addColumn('stock_per_year', 'integer')
    .addColumn('student_id', 'text', (cb) => {
      return cb.references('students.id').notNull();
    })
    .addColumn('updated_at', 'timestamptz', (cb) =>
      cb.notNull().defaultTo(sql`now()`)
    )
    .addColumn('location', 'text')
    .addColumn('location_coordinates', sql`point`)
    .addColumn('location_type', 'text', (cb) => cb.notNull())
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('job_offers').execute();
}
