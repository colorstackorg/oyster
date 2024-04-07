import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('allow_email_share', 'boolean', (column) => {
      return column.notNull().defaultTo(true);
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .dropColumn('allow_email_share')
    .execute();
}
