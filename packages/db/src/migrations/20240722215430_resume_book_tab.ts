import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resume_books')
    .addColumn('hidden', 'boolean')
    .execute();

  await db.updateTable('resume_books').set({ hidden: true }).execute();

  await db.schema
    .alterTable('resume_books')
    .alterColumn('hidden', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('resume_books').dropColumn('hidden').execute();
}
