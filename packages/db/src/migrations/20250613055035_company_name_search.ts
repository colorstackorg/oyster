import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('companies')
    .alterColumn('crunchbase_id', (column) => {
      return column.dropNotNull();
    })
    .execute();

  await db.schema
    .createIndex('companies_name_trgm_idx')
    .on('companies')
    .using('gin')
    .expression(sql`lower(name) gin_trgm_ops`)
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropIndex('companies_name_trgm_idx').execute();

  await db.schema
    .alterTable('companies')
    .alterColumn('crunchbase_id', (column) => {
      return column.setNotNull();
    })
    .execute();
}
