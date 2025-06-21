import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('schools')
    .alterColumn('address_zip', (column) => {
      return column.dropNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('schools')
    .alterColumn('address_zip', (column) => {
      return column.setNotNull();
    })
    .execute();
}
