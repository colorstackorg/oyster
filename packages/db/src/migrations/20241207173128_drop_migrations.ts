import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema.dropTable('migrations').cascade().execute();
}

export async function down(_: Kysely<any>) {}
