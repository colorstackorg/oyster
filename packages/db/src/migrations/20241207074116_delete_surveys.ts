import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db
    .deleteFrom('completed_activities')
    .where('type', '=', 'respond_to_survey')
    .execute();

  await db.schema.dropTable('survey_responses').cascade().execute();
  await db.schema.dropTable('surveys').cascade().execute();
}

export async function down(_: Kysely<any>) {}
