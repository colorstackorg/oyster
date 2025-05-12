import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // This will help when querying upvotes by resource.
  await db.schema
    .createIndex('resource_upvotes_resource_id_idx')
    .on('resource_upvotes')
    .column('resource_id')
    .execute();

  // This will help when querying upvotes by student.
  await db.schema
    .createIndex('resource_upvotes_student_id_idx')
    .on('resource_upvotes')
    .column('student_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropIndex('resource_upvotes_resource_id_idx').execute();

  await db.schema.dropIndex('resource_upvotes_student_id_idx').execute();
}
