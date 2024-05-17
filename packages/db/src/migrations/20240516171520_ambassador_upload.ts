import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('onboarding_sessions')
    .addColumn('uploaded_by_id', 'text')
    .execute();

  await db.schema
    .alterTable('onboarding_sessions')
    .addForeignKeyConstraint(
      'fk_uploaded_by_id_admins_id',
      ['uploaded_by_id'],
      'admins',
      ['id']
    )
    .onDelete('set null')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('onboarding_sessions')
    .dropConstraint('fk_uploaded_by_id_admins_id')
    .execute();

  await db.schema
    .alterTable('onboarding_sessions')
    .dropColumn('uploaded_by_id')
    .execute();
}
