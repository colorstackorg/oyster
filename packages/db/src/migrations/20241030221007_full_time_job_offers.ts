import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('full_time_job_offers')
    .addColumn('id', 'text', (cb) => {
      return cb.primaryKey();
    })
    .addColumn('created_at', 'timestamptz', (cb) =>
      cb.notNull().defaultTo(sql`now()`)
    )
    .addColumn('base_salary', 'integer')
    .addColumn('bonus', 'integer')
    .addColumn('bonus_text', 'text')
    .addColumn('relocation', 'integer')
    .addColumn('relocation_text', 'text')
    .addColumn('company_id', 'text', (cb) => {
      return cb.references('companies.id');
    })
    .addColumn('other_company', 'text')
    .addColumn('start_date', 'date')
    .addColumn('stock_per_year', 'integer')
    .addColumn('equity_or_stock_text', 'text')
    .addColumn('updated_at', 'timestamptz', (cb) =>
      cb.notNull().defaultTo(sql`now()`)
    )
    .addColumn('location', 'text')
    .addColumn('location_coordinates', sql`point`)
    .addColumn('location_type', 'text')
    .addColumn('role', 'text')
    .addColumn('total_compensation_text', 'text')
    .addColumn('benefits', 'text')
    .addColumn('is_negotiated', 'boolean', (cb) =>
      cb.notNull().defaultTo(false)
    )
    .addColumn('is_accepted', 'boolean', (cb) => cb.notNull().defaultTo(false))
    .addColumn('decision_reason', 'text')
    .addColumn('posted_by', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .addColumn('slack_channel_id', 'text', (cb) => cb.notNull())
    .addColumn('slack_message_id', 'text', (cb) => cb.notNull())
    .addForeignKeyConstraint(
      'full_time_job_offers_slack_message_fkey',
      ['slack_channel_id', 'slack_message_id'],
      'slack_messages',
      ['channel_id', 'id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .execute();

  // This will help when querying job offers by company.
  await db.schema
    .createIndex('full_time_job_offers_company_id_idx')
    .on('full_time_job_offers')
    .column('company_id')
    .execute();

  // This will help when querying job offers by the student who posted them.
  await db.schema
    .createIndex('full_time_job_offers_posted_by_idx')
    .on('full_time_job_offers')
    .column('posted_by')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('full_time_job_offers').execute();
}
