import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // Was never used and is no longer needed.
  await db.schema.dropTable('job_offers').execute();

  await db.schema
    .createTable('internship_job_offers')
    .addColumn('additional_notes', 'text')
    .addColumn('benefits', 'text')
    .addColumn('company_id', 'text', (column) => {
      return column.references('companies.id');
    })
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('hourly_rate', 'integer')
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('location', 'text')
    .addColumn('location_type', 'text')
    .addColumn('monthly_rate', 'integer')
    .addColumn('negotiated_text', 'text')
    .addColumn('other_company', 'text')
    .addColumn('posted_by', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .addColumn('relocation_text', 'text')
    .addColumn('role', 'text')
    .addColumn('slack_channel_id', 'text')
    .addColumn('slack_message_id', 'text')
    .addColumn('updated_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('years_of_experience', 'text')
    .addForeignKeyConstraint(
      'internship_job_offers_slack_message_fkey',
      ['slack_channel_id', 'slack_message_id'],
      'slack_messages',
      ['channel_id', 'id'],
      (constraint) => {
        return constraint.onDelete('cascade');
      }
    )
    .execute();

  await db.schema
    .createTable('full_time_job_offers')
    .addColumn('additional_notes', 'text')
    .addColumn('base_salary', 'integer')
    .addColumn('bonus', 'integer')
    .addColumn('company_id', 'text', (column) => {
      return column.references('companies.id');
    })
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('hourly_rate', 'integer')
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('location', 'text')
    .addColumn('location_type', 'text')
    .addColumn('negotiated_text', 'text')
    .addColumn('other_company', 'text')
    .addColumn('performance_bonus_text', 'text')
    .addColumn('posted_by', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .addColumn('relocation_text', 'text')
    .addColumn('role', 'text')
    .addColumn('sign_on_bonus_text', 'text')
    .addColumn('slack_channel_id', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('slack_message_id', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('stock_per_year', 'integer')
    .addColumn('total_compensation', 'integer')
    .addColumn('updated_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('years_of_experience', 'text')
    .addForeignKeyConstraint(
      'full_time_job_offers_slack_message_fkey',
      ['slack_channel_id', 'slack_message_id'],
      'slack_messages',
      ['channel_id', 'id'],
      (constraint) => {
        return constraint.onDelete('cascade');
      }
    )
    .execute();

  // Will help when querying internship job offers by company.
  await db.schema
    .createIndex('internship_job_offers_company_id_idx')
    .on('internship_job_offers')
    .column('company_id')
    .execute();

  // Will help when querying internship job offers by who posted them.
  await db.schema
    .createIndex('internship_job_offers_posted_by_idx')
    .on('internship_job_offers')
    .column('posted_by')
    .execute();

  // Will help when querying FT job offers by company.
  await db.schema
    .createIndex('full_time_job_offers_company_id_idx')
    .on('full_time_job_offers')
    .column('company_id')
    .execute();

  // Will help when querying FT job offers by who posted them.
  await db.schema
    .createIndex('full_time_job_offers_posted_by_idx')
    .on('full_time_job_offers')
    .column('posted_by')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('internship_job_offers').execute();
  await db.schema.dropTable('full_time_job_offers').execute();
}
