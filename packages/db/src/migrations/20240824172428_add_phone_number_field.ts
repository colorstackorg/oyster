import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('phone_number', 'integer')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('students').dropColumn('phone_number').execute();
}
