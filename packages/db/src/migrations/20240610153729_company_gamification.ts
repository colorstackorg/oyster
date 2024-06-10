import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .addColumn('work_experience_id', 'text', (column) => {
      return column.references('work_experiences.id');
    })
    .execute();

  await db.schema
    .createIndex('completed_activities_review_company_idx')
    .unique()
    .on('completed_activities')
    .columns(['type', 'work_experience_id'])
    .where('type', '=', 'review_company')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .dropIndex('completed_activities_review_company_idx')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropColumn('work_experience_id')
    .execute();
}
