import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('allow_email_share', 'boolean')
    .execute();

  await db.updateTable('students').set({ allow_email_share: true }).execute();

  await db.schema
    .alterTable('students')
    .alterColumn('allow_email_share', (column) => {
      return column.setDefault(true);
    })
    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('allow_email_share', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .dropColumn('allow_email_share')
    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('allow_email_share', (column) => {
      return column.dropNotNull();
    })

    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('allow_email_share', (column) => {
      return column.dropDefault();
    })
    .execute();
}
