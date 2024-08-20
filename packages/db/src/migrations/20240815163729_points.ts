import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('students')
    .addColumn('points', 'integer', (column) => {
      return column.defaultTo(0).notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('students').dropColumn('points').execute();
}
