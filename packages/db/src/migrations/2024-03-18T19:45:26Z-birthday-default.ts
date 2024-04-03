import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db
    .updateTable('students')
    .set({ birthdate_notification: true })
    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('birthdate_notification', (column) => {
      return column.setDefault(true);
    })
    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('birthdate_notification', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .alterColumn('birthdate_notification', (column) => {
      return column.dropNotNull();
    })

    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('birthdate_notification', (column) => {
      return column.dropDefault();
    })
    .execute();
}
