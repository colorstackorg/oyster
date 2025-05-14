import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resource_tags')
    .renameTo('resource_tag_associations')
    .execute();

  await db.schema.alterTable('tags').renameTo('resource_tags').execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('resource_tags').renameTo('tags').execute();

  await db.schema
    .alterTable('resource_tag_associations')
    .renameTo('resource_tags')
    .execute();
}
