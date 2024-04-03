import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('birthdate_notification', 'boolean')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .dropColumn('birthdate_notification')
    .execute();
}