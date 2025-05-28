import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('educations')
    .alterColumn('end_date', (column) => {
      return column.dropNotNull();
    })
    .alterColumn('start_date', (column) => {
      return column.dropNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('educations')
    .alterColumn('end_date', (column) => {
      return column.setNotNull();
    })
    .alterColumn('start_date', (column) => {
      return column.setNotNull();
    })
    .execute();
}
