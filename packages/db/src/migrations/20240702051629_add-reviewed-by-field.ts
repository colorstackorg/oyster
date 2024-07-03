import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .addColumn('reviewed_by', 'text', (column) => {
      return column.references('admins.id').onDelete('set null');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('applications')
    .dropColumn('reviewed_by')
    .execute();
}
