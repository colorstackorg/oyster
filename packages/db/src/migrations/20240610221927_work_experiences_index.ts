import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createIndex('work_experiences_company_id_idx')
    .on('work_experiences')
    .column('company_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .dropIndex('work_experiences_company_id_idx')
    .on('work_experiences')
    .execute();
}
