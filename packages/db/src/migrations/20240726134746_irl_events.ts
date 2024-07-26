import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('events')
    .addColumn('hidden', 'boolean')
    .dropColumn('deleted_at')
    .execute();

  await db
    .updateTable('events')
    .set((eb) => {
      return {
        hidden: eb('type', '=', 'irl'),
      };
    })
    .execute();

  await db.schema
    .alterTable('events')
    .alterColumn('hidden', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('events')
    .addColumn('deleted_at', 'timestamptz')
    .dropColumn('hidden')
    .execute();
}
