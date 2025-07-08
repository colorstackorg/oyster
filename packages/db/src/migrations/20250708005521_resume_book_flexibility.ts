import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resumeBookSubmissions')
    .alterColumn('education_id', (alteration) => {
      return alteration.dropNotNull();
    })
    .addColumn('education_level', 'text')
    .addColumn('graduation_season', 'text')
    .addColumn('graduation_year', 'integer')
    .addColumn('university_location', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('resumeBookSubmissions')
    .alterColumn('education_id', (alteration) => {
      return alteration.setNotNull();
    })
    .dropColumn('education_level')
    .dropColumn('graduation_season')
    .dropColumn('graduation_year')
    .dropColumn('university_location')
    .execute();
}
