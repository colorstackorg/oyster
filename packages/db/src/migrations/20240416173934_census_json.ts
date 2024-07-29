import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('census_responses')
    .alterColumn('json', (column) => {
      return column.setDataType('json');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('census_responses')
    .alterColumn('json', (column) => {
      return column.setDataType('jsonb');
    })
    .execute();
}
