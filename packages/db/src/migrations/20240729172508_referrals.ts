import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('referrals')
    .addColumn('email', 'text', (column) => {
      return column.notNull().unique();
    })
    .addColumn('first_name', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('id', 'text', (column) => {
      return column.primaryKey();
    })
    .addColumn('last_name', 'text', (column) => {
      return column.notNull();
    })
    .addColumn('referred_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .addColumn('referrer_id', 'text', (column) => {
      return column.notNull().references('students.id');
    })
    .addColumn('status', 'text', (column) => {
      return column.notNull();
    })
    .execute();

  await db.schema
    .alterTable('applications')
    .addColumn('referral_id', 'text', (column) => {
      return column.references('referrals.id');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .dropColumn('referral_id')
    .execute();

  await db.schema.dropTable('referrals').execute();
}
