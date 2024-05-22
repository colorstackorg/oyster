import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('resources')
    .addColumn('description', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('last_updated_at', 'timestamptz')
    .addColumn('link', 'text')
    .addColumn('posted_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('posted_by', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addColumn('title', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('type', 'text', (column) => {
      return column.notNull();
    })
    .execute();

  await db.schema
    .createTable('tags')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('name', 'text', (column) => {
      return column.notNull();
    })
    .execute();

  await db.schema
    .createTable('resource_tags')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('resource_id', 'text', (column) => {
      return column.notNull().references('resources.id');
    })
    .addColumn('tag_id', 'text', (column) => {
      return column.notNull().references('tags.id');
    })
    .addPrimaryKeyConstraint('resource_tags_pkey', ['resource_id', 'tag_id'])
    .execute();

  await db.schema
    .createTable('resource_upvotes')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('resource_id', 'text', (column) => {
      return column.notNull().references('resources.id');
    })
    .addColumn('student_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addPrimaryKeyConstraint('resource_upvotes_pkey', [
      'resource_id',
      'student_id',
    ])
    .execute();

  await db.schema
    .createTable('resource_attachments')
    .addColumn('created_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('resource_id', 'text', (column) => {
      return column.notNull().references('resources.id');
    })
    .addColumn('s3_key', 'text', (column) => {
      return column.notNull().unique();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('resource_attachments').execute();
  await db.schema.dropTable('resource_upvotes').execute();
  await db.schema.dropTable('resource_tags').execute();
  await db.schema.dropTable('tags').execute();
  await db.schema.dropTable('resources').execute();
}
