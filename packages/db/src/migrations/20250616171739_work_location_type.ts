import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .alterColumn('location_type', (column) => {
      return column.dropNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .alterColumn('location_type', (column) => {
      return column.setNotNull();
    })
    .execute();
}
