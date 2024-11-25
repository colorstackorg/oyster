import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // Internship Job Offers

  await db.schema
    .alterTable('internship_job_offers')
    .alterColumn('hourly_rate', (column) => {
      return column.setDataType('decimal(10, 2)');
    })
    .alterColumn('hourly_rate', (column) => {
      return column.setNotNull();
    })
    .alterColumn('location', (column) => {
      return column.setNotNull();
    })
    .dropColumn('location_type')
    .dropColumn('monthly_rate')
    .addColumn('posted_at', 'timestamptz', (column) => {
      return column.notNull();
    })
    .addColumn('sign_on_bonus', 'decimal(10, 2)')
    .execute();

  await db.schema
    .alterTable('internship_job_offers')
    .renameColumn('negotiated_text', 'negotiated')
    .execute();

  await db.schema
    .alterTable('internship_job_offers')
    .renameColumn('relocation_text', 'relocation')
    .execute();

  await db.schema
    .alterTable('internship_job_offers')
    .renameColumn('years_of_experience', 'past_experience')
    .execute();

  await db.schema
    .alterTable('internship_job_offers')
    .addUniqueConstraint('internship_job_offers_slack_message_key', [
      'slack_channel_id',
      'slack_message_id',
    ])
    .execute();

  // Full-Time Job Offers

  await db.schema
    .alterTable('full_time_job_offers')
    .alterColumn('base_salary', (column) => {
      return column.setDataType('decimal(10, 2)');
    })
    .alterColumn('base_salary', (column) => {
      return column.setNotNull();
    })
    .dropColumn('bonus')
    .dropColumn('hourly_rate')
    .alterColumn('location', (column) => {
      return column.setNotNull();
    })
    .dropColumn('location_type')
    .addColumn('performance_bonus', 'decimal(10, 2)')
    .dropColumn('performance_bonus_text')
    .addColumn('posted_at', 'timestamptz', (column) => {
      return column.notNull();
    })
    .dropColumn('sign_on_bonus_text')
    .addColumn('sign_on_bonus', 'decimal(10, 2)')
    .alterColumn('slack_channel_id', (column) => {
      return column.dropNotNull();
    })
    .alterColumn('slack_message_id', (column) => {
      return column.dropNotNull();
    })
    .alterColumn('stock_per_year', (column) => {
      return column.setDataType('decimal(10, 2)');
    })
    .dropColumn('total_compensation')
    .execute();

  await db.schema
    .alterTable('full_time_job_offers')
    .renameColumn('negotiated_text', 'negotiated')
    .execute();

  await db.schema
    .alterTable('full_time_job_offers')
    .renameColumn('relocation_text', 'relocation')
    .execute();

  await db.schema
    .alterTable('full_time_job_offers')
    .renameColumn('stock_per_year', 'total_stock')
    .execute();

  await db.schema
    .alterTable('full_time_job_offers')
    .renameColumn('years_of_experience', 'past_experience')
    .execute();

  await db.schema
    .alterTable('full_time_job_offers')
    .addUniqueConstraint('full_time_job_offers_slack_message_key', [
      'slack_channel_id',
      'slack_message_id',
    ])
    .execute();
}

export async function down(_: Kysely<any>) {}
