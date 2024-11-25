import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .addColumn('census_year', 'integer')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addUniqueConstraint('completed_activities_census_year_student_id_key', [
      'census_year',
      'student_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .dropConstraint('completed_activities_census_year_student_id_key')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropColumn('census_year')
    .execute();
}
