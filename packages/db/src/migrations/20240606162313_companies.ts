import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .dropColumn('deleted_at')
    .dropColumn('updated_at')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('updated_at', 'timestamptz', (column) => {
      return column.notNull().defaultTo(sql`now()`);
    })
    .execute();
}
