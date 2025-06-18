import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('educations')
    .addColumn('linkedin_synced_at', 'timestamptz')
    .execute();

  await db.schema
    .alterTable('work_experiences')
    .addColumn('description', 'text')
    .addColumn('linkedin_synced_at', 'timestamptz')
    .addColumn('location_country', 'text')
    .alterColumn('employment_type', (column) => {
      return column.dropNotNull();
    })
    .alterColumn('location_type', (column) => {
      return column.dropNotNull();
    })
    .execute();

  await db.schema
    .alterTable('schools')
    .addColumn('address_country', 'text')
    .execute();

  await db.updateTable('schools').set({ address_country: 'US' }).execute();

  await db.schema
    .alterTable('schools')
    .alterColumn('address_country', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('work_experiences')
    .dropColumn('description')
    .dropColumn('linkedin_synced_at')
    .dropColumn('location_country')
    .alterColumn('employment_type', (column) => {
      return column.setNotNull();
    })
    .alterColumn('location_type', (column) => {
      return column.setNotNull();
    })
    .execute();

  await db.schema.alterTable('schools').dropColumn('address_country').execute();

  await db.schema
    .alterTable('educations')
    .dropColumn('linkedin_synced_at')
    .execute();
}
