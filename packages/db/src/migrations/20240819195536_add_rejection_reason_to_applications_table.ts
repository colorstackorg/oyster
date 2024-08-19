import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .addColumn('rejectionReason', 'varchar(255)')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .dropColumn('rejectionReason')
    .execute();
}
