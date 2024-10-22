import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('opportunities')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('description', 'text')
    .addColumn('expires_at', 'timestamptz', (column) => {
      return column.notNull();
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('posted_by', 'text', (column) => {
      return column.references('students.id').onDelete('set null');
    })
    .addColumn('slack_channel_id', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('slack_message_id', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('title', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('type', 'text', (column) => {
      return column.notNull();
    })
    .addForeignKeyConstraint(
      'opportunities_slack_message_fkey',
      ['slack_channel_id', 'slack_message_id'],
      'slack_messages',
      ['channel_id', 'id'],
      (constraint) => {
        return constraint.onDelete('cascade');
      }
    )
    .execute();

  await db.schema
    .createTable('opportunity_companies')
    .addColumn('company_id', 'text', (column) => {
      return column.notNull().references('companies.id');
    })
    .addColumn('opportunity_id', 'text', (column) => {
      return column
        .notNull()
        .references('opportunities.id')
        .onDelete('cascade');
    })
    .addPrimaryKeyConstraint('opportunity_companies_pkey', [
      'company_id',
      'opportunity_id',
    ])
    .execute();

  await db.schema
    .createTable('opportunity_tags')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('name', 'text', (column) => {
      return column.notNull().unique();
    })
    .execute();

  await db.schema
    .createTable('opportunity_tag_associations')
    .addColumn('opportunity_id', 'text', (column) => {
      return column
        .notNull()
        .references('opportunities.id')
        .onDelete('cascade');
    })
    .addColumn('tag_id', 'text', (column) => {
      return column
        .notNull()
        .references('opportunity_tags.id')
        .onDelete('cascade');
    })
    .addPrimaryKeyConstraint('opportunity_tag_associations_pkey', [
      'opportunity_id',
      'tag_id',
    ])
    .execute();

  await db.schema
    .createTable('opportunity_bookmarks')
    .addColumn('opportunity_id', 'text', (column) => {
      return column
        .notNull()
        .references('opportunities.id')
        .onDelete('cascade');
    })
    .addColumn('student_id', 'text', (column) => {
      return column.notNull().references('students.id').onDelete('cascade');
    })
    .addPrimaryKeyConstraint('opportunity_bookmarks_pkey', [
      'opportunity_id',
      'student_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('opportunity_bookmarks').execute();
  await db.schema.dropTable('opportunity_tag_associations').execute();
  await db.schema.dropTable('opportunity_tags').execute();
  await db.schema.dropTable('opportunity_companies').execute();
  await db.schema.dropTable('opportunities').execute();
}
