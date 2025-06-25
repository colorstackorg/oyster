import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .addColumn('visible', 'boolean', (column) => column.defaultTo(true))
    .execute();

  await db.schema
    .alterTable('educations')
    .addColumn('visible', 'boolean', (column) => column.defaultTo(true))
    .execute();

  await db.updateTable('educations').set({ visible: true }).execute();
  await db.updateTable('work_experiences').set({ visible: true }).execute();

  await db.schema
    .alterTable('work_experiences')
    .alterColumn('visible', (column) => column.setNotNull())
    .execute();

  await db.schema
    .alterTable('educations')
    .alterColumn('visible', (column) => column.setNotNull())
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .dropColumn('visible')
    .execute();

  await db.schema.alterTable('educations').dropColumn('visible').execute();
}
