import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('completed_activities')
    .addColumn('resource_upvoted_by', 'text', (column) => {
      return column.references('students.id');
    })
    .execute();

  await db.schema
    .dropIndex('completed_activities_resource_id_student_id_upvote_idx')
    .execute();

  await db.schema
    .createIndex('completed_activities_resource_id_student_id_upvote_idx')
    .unique()
    .on('completed_activities')
    .columns(['resource_id', 'resource_upvoted_by', 'student_id', 'type'])
    .where('type', '=', 'get_resource_upvote')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .dropIndex('completed_activities_resource_id_student_id_upvote_idx')
    .execute();

  await db.schema
    .createIndex('completed_activities_resource_id_student_id_upvote_idx')
    .unique()
    .on('completed_activities')
    .columns(['resource_id', 'student_id', 'type'])
    .where('type', '=', 'upvote_resource')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropColumn('resource_upvoted_by')
    .execute();
}
