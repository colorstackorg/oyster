import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .addColumn('description', 'text')
    .alterColumn('location_type', (column) => {
      return column.dropNotNull();
    })
    .addColumn('source', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .dropColumn('description')
    .alterColumn('location_type', (column) => {
      return column.setNotNull();
    })
    .dropColumn('source')
    .execute();
}
