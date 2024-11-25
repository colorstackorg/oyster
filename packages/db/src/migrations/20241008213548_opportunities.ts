import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('opportunities')
    .addColumn('company_id', 'text', (column) => {
      return column.references('companies.id').onDelete('set null');
    })
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('description', 'text', (column) => {
      return column.notNull();
    })
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

  // This will help when querying opportunities by company.
  await db.schema
    .createIndex('opportunities_company_id_idx')
    .on('opportunities')
    .column('company_id')
    .execute();

  // This will help when querying opportunities by expiration date.
  await db.schema
    .createIndex('opportunities_expires_at_idx')
    .on('opportunities')
    .column('expires_at')
    .execute();

  // This will help when looking up opportunities by the student who posted them.
  await db.schema
    .createIndex('opportunities_posted_by_idx')
    .on('opportunities')
    .column('posted_by')
    .execute();

  await db.schema
    .createTable('opportunity_tags')
    .addColumn('color', 'text', (column) => {
      return column.notNull();
    })
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

  // This will help when querying associations by opportunity.
  await db.schema
    .createIndex('opportunity_tag_associations_opportunity_id_idx')
    .on('opportunity_tag_associations')
    .column('opportunity_id')
    .execute();

  // This will help when querying associations by tag.
  await db.schema
    .createIndex('opportunity_tag_associations_tag_id_idx')
    .on('opportunity_tag_associations')
    .column('tag_id')
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

  // This will help when querying bookmarks by opportunity.
  await db.schema
    .createIndex('opportunity_bookmarks_opportunity_id_idx')
    .on('opportunity_bookmarks')
    .column('opportunity_id')
    .execute();

  // This will help when querying bookmarks by student.
  await db.schema
    .createIndex('opportunity_bookmarks_student_id_idx')
    .on('opportunity_bookmarks')
    .column('student_id')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addColumn('opportunity_bookmarked_by', 'text')
    .addColumn('opportunity_id', 'text')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addForeignKeyConstraint(
      'completed_activities_opportunity_bookmark_fkey',
      ['opportunity_id', 'opportunity_bookmarked_by'],
      'opportunity_bookmarks',
      ['opportunity_id', 'student_id']
    )
    .onDelete('cascade')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropIndex('opportunities_company_id_idx').execute();
  await db.schema.dropIndex('opportunities_expires_at_idx').execute();
  await db.schema.dropIndex('opportunities_posted_by_idx').execute();
  await db.schema.dropIndex('opportunity_bookmarks_student_id_idx').execute();

  await db.schema
    .dropIndex('opportunity_bookmarks_opportunity_id_idx')
    .execute();

  await db.schema
    .dropIndex('opportunity_tag_associations_opportunity_id_idx')
    .execute();

  await db.schema
    .dropIndex('opportunity_tag_associations_tag_id_idx')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropConstraint('completed_activities_opportunity_bookmark_fkey')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropColumn('opportunity_bookmarked_by')
    .dropColumn('opportunity_id')
    .execute();

  await db.schema.dropTable('opportunity_bookmarks').execute();
  await db.schema.dropTable('opportunity_tag_associations').execute();
  await db.schema.dropTable('opportunity_tags').execute();
  await db.schema.dropTable('opportunities').execute();
}
