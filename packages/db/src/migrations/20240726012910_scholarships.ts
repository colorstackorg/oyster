import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('scholarship_recipients')
    .dropColumn('deleted_at')
    .dropColumn('updated_at')
    .addColumn('email', 'text')
    .alterColumn('awarded_at', (column) => {
      return column.setDataType('date');
    })
    .alterColumn('student_id', (column) => {
      return column.dropNotNull();
    })
    .execute();

  await db.schema
    .alterTable('scholarship_recipients')
    .renameColumn('awarded_at', 'award_date')
    .execute();

  await db
    .updateTable('scholarship_recipients')
    .set({
      email: db
        .selectFrom('students')
        .select('email')
        .whereRef('students.id', '=', 'scholarship_recipients.student_id')
        .limit(1),
    })
    .execute();

  await db.schema
    .alterTable('scholarship_recipients')
    .alterColumn('email', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('scholarship_recipients')
    .addColumn('updated_at', 'timestamptz')
    .addColumn('deleted_at', 'timestamptz')
    .dropColumn('email')
    .alterColumn('award_date', (column) => {
      return column.setDataType('timestamptz');
    })
    .alterColumn('student_id', (column) => {
      return column.setNotNull();
    })
    .execute();

  await db.schema
    .alterTable('scholarship_recipients')
    .renameColumn('award_date', 'awarded_at')
    .execute();
}
