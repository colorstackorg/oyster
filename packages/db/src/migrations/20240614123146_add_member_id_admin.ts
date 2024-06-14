import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('admins')
    .addColumn('member_id', 'text', (column) => {
      return column.references('students.id').onDelete('cascade');
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('admins').dropColumn('member_id').execute();
}
