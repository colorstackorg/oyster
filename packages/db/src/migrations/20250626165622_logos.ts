import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .addColumn('logo_key', 'text')
    .execute();

  await db.schema.alterTable('schools').addColumn('logo_key', 'text').execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('companies').dropColumn('logo_key').execute();
  await db.schema.alterTable('schools').dropColumn('logo_key').execute();
}
