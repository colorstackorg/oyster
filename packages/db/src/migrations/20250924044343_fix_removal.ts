import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // applications

  await db.schema
    .alterTable('applications')
    .dropConstraint('applications_referral_id_fkey')
    .execute();

  await db.schema
    .alterTable('applications')
    .addForeignKeyConstraint(
      'applications_referral_id_fkey',
      ['referral_id'],
      'referrals',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  // opportunity_reports

  await db.schema
    .alterTable('opportunity_reports')
    .dropConstraint('opportunity_reports_reporter_id_fkey')
    .execute();

  await db.schema
    .alterTable('opportunity_reports')
    .addForeignKeyConstraint(
      'opportunity_reports_reporter_id_fkey',
      ['reporter_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();
}

export async function down(_: Kysely<any>) {}
