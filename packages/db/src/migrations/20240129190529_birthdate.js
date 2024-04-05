import { Kysely } from 'kysely';

export async function up(db) {
  await db.schema
    .alterTable('students')
    .addColumn('birthdate', 'date')
    .execute();
}

export async function down(db) {
  await db.schema.alterTable('students').dropColumn('birthdate').execute();
}
