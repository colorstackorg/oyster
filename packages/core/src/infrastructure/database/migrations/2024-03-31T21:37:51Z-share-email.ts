import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.updateTable('students').set({ share_email: true }).execute();

  await db.schema
    .alterTable('students')
    .alterColumn('share_email', (column) => {
      return column.setDefault(true);
    })
    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('share_email', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('students').dropColumn('share_email').execute();

  await db.schema
    .alterTable('students')
    .alterColumn('share_email', (column) => {
      return column.dropNotNull();
    })

    .execute();

  await db.schema
    .alterTable('students')
    .alterColumn('share_email', (column) => {
      return column.dropDefault();
    })
    .execute();
}
