import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('onboarding_sessions')
    .addColumn('uploaded_by_id', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('onboarding_sessions')
    .dropColumn('uploaded_by_id')
    .execute();
}
