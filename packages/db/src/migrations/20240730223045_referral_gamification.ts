import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .addColumn('referral_id', 'text', (column) => {
      return column.references('referrals.id');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .dropColumn('referral_id')
    .execute();
}
