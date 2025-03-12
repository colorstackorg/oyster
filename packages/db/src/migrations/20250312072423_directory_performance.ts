import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createIndex('educations_student_id_idx')
    .on('educations')
    .column('student_id')
    .execute();

  await db.schema
    .createIndex('work_experiences_student_id_idx')
    .on('work_experiences')
    .column('student_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropIndex('educations_student_id_idx').execute();
  await db.schema.dropIndex('work_experiences_student_id_idx').execute();
}
