import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema.dropTable('scholarship_recipients').execute();
  await db.schema.dropTable('program_participants').execute();
  await db.schema.dropTable('programs').execute();
  await db.schema.dropTable('internal_resource_users').execute();
  await db.schema.dropTable('internal_resources').execute();
}

export async function down(_: Kysely<any>) {}
