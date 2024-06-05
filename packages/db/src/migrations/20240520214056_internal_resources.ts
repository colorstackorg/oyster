import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resources')
    .renameTo('internal_resources')
    .execute();

  await db.schema
    .alterTable('resource_users')
    .renameTo('internal_resource_users')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('internal_resources')
    .renameTo('resources')
    .execute();

  await db.schema
    .alterTable('internal_resource_users')
    .renameTo('resource_users')
    .execute();
}
