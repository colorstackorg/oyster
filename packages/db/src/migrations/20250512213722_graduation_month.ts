import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .dropColumn('graduation_date')
    .execute();

  await db.schema
    .alterTable('students')
    .dropColumn('graduation_date')
    .execute();

  await db.schema
    .alterTable('applications')
    .addColumn('graduation_month', 'integer')
    .execute();

  await db.schema
    .alterTable('students')
    .addColumn('graduation_month', 'integer')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .dropColumn('graduation_month')
    .execute();

  await db.schema
    .alterTable('students')
    .dropColumn('graduation_month')
    .execute();

  await db.schema
    .alterTable('applications')
    .addColumn('graduation_date', 'date')
    .execute();

  await db.schema
    .alterTable('students')
    .addColumn('graduation_date', 'date')
    .execute();
}
