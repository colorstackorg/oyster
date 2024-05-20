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
    .addColumn('last_updated_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('link', 'text')
    .addColumn('posted_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('title', 'text', (column) => {
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
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('resource_tags').execute();
  await db.schema.dropTable('tags').execute();
  await db.schema.dropTable('resources').execute();
}
