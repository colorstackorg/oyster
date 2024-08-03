import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('work_authorization_status', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .dropColumn('work_authorization_status')
    .execute();
}
