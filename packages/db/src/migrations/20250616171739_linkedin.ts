import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .addColumn('description', 'text')
    .addColumn('linkedin_synced_at', 'timestamptz')
    .alterColumn('employment_type', (column) => {
      return column.dropNotNull();
    })
    .alterColumn('location_type', (column) => {
      return column.dropNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .dropColumn('description')
    .dropColumn('linkedin_synced_at')
    .alterColumn('employment_type', (column) => {
      return column.setNotNull();
    })
    .alterColumn('location_type', (column) => {
      return column.setNotNull();
    })
    .execute();
}
