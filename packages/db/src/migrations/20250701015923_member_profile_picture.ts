import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('profile_picture_key', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .dropColumn('profile_picture_key')
    .execute();
}
