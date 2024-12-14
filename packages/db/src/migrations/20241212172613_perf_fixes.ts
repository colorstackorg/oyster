import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createIndex('slack_reactions_created_at_student_id_idx')
    .on('slack_reactions')
    .columns(['created_at', 'student_id'])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .dropIndex('slack_reactions_created_at_student_id_idx')
    .execute();
}
