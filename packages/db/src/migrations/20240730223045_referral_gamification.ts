import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .addColumn('email', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .dropColumn('email')
    .execute();
}
