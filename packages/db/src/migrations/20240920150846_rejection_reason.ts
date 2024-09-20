import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .addColumn('rejection_reason', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .dropColumn('rejection_reason')
    .execute();
}
