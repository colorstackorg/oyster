import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('help_requests')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('description', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('finish_notification_count', 'integer', (column) => {
      return column.notNull().defaultTo(0);
    })
    .addColumn('finished_at', 'timestamptz')
    .addColumn('helpee_feedback', 'text')
    .addColumn('helpee_id', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .addColumn('helper_id', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('offered_at', 'timestamptz')
    .addColumn('slack_channel_id', 'text')
    .addColumn('status', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('type', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('updated_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addColumn('help_request_id', 'text', (column) => {
      // The reason we can make this unique is because only the person who is
      // helping can complete the activity, so it's guaranteed that each
      // completed activity is associated with only one help request.
      return column.unique().references('help_requests.id').onDelete('cascade');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .dropColumn('help_request_id')
    .execute();

  await db.schema.dropTable('help_requests').cascade().execute();
}
