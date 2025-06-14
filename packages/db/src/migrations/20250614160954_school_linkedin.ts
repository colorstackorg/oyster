import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('schools')
    .addColumn('linkedin_id', 'text', (column) => {
      return column.unique();
    })
    .addColumn('logo_url', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('schools')
    .dropColumn('linkedin_id')
    .dropColumn('logo_url')
    .execute();
}
