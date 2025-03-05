import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('opportunity_reports')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('opportunity_id', 'text', (column) => {
      return column.references('opportunities.id');
    })
    .addColumn('reporter_id', 'text', (column) => {
      return column.references('students.id');
    })
    .addColumn('reason', 'text', (column) => {
      return column.notNull();
    })
    .addPrimaryKeyConstraint('opportunity_reports_pkey', [
      'opportunity_id',
      'reporter_id',
    ])
    .execute();

  await db.schema
    .alterTable('opportunities')
    .alterColumn('slack_channel_id', (column) => {
      return column.dropNotNull();
    })
    .alterColumn('slack_message_id', (column) => {
      return column.dropNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('opportunities')
    .alterColumn('slack_channel_id', (column) => {
      return column.setNotNull();
    })
    .alterColumn('slack_message_id', (column) => {
      return column.setNotNull();
    })
    .execute();

  await db.schema.dropTable('opportunity_reports').execute();
}
