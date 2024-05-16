import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('onboarding_sessions')
    .addColumn('ambassador', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('onboarding_sessions')
    .dropColumn('ambassador')
    .execute();
}
