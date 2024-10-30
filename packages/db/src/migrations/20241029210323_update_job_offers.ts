import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('job_offers')
    .addColumn('role', 'text')
    .addColumn('bonus_text', 'text')
    .addColumn('equity_or_stock_text', 'text')
    .addColumn('sign_on_bonus', 'integer')
    .addColumn('relocation', 'integer')
    .addColumn('relocation_text', 'text')
    .addColumn('benefits', 'text')
    .addColumn('total_compensation_text', 'text')
    .addColumn('is_negotiated', 'boolean')
    .addColumn('is_accepted', 'boolean')
    .addColumn('accepted_reason', 'text')
    .addColumn('posted_by', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .addColumn('slack_channel_id', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('slack_message_id', 'text', (column) => {
      return column.notNull();
    })
    .alterColumn('start_date', (col) => col.dropNotNull())
    .alterColumn('compensation_type', (col) => col.dropNotNull())
    .alterColumn('employment_type', (col) => col.dropNotNull())
    .alterColumn('location_type', (col) => col.dropNotNull())
    .dropColumn('student_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('job_offers')
    .addColumn('student_id', 'text', (cb) => {
      return cb.references('students.id').notNull();
    })
    .dropColumn('role')
    .dropColumn('bonus_text')
    .dropColumn('equity_or_stock_text')
    .dropColumn('sign_on_bonus')
    .dropColumn('relocation')
    .dropColumn('relocation_text')
    .dropColumn('benefits')
    .dropColumn('total_compensation_text')
    .dropColumn('is_negotiated')
    .dropColumn('is_accepted')
    .dropColumn('accepted_reason')
    .dropColumn('posted_by')
    .dropColumn('slack_channel_id')
    .dropColumn('slack_message_id')
    .alterColumn('start_date', (col) => col.setNotNull())
    .alterColumn('compensation_type', (col) => col.setNotNull())
    .alterColumn('employment_type', (col) => col.setNotNull())
    .alterColumn('location_type', (col) => col.setNotNull())
    .execute();
}
