import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // Populate member_id column in admins table
  await db
    .updateTable('admins')
    .set({
      member_id: db
        .selectFrom('students')
        .select(['id'])
        .where('students.email', '=', 'admins.email'),
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.updateTable('admins').set({ member_id: null }).execute(); //nullify but do not remove member_id column
}
