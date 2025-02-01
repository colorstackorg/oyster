import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('mentors')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('firstName', 'text', (col) => col.notNull())
    .addColumn('lastName', 'text', (col) => col.notNull())
    .addColumn('createdAt', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updatedAt', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('deletedAt', 'timestamp')
    .execute();

  await db.schema
    .alterTable('oneTimeCodes')
    .addColumn('mentorId', 'text', (col) =>
      col.references('mentors.id').onDelete('cascade')
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('oneTimeCodes').dropColumn('mentorId').execute();

  await db.schema.dropTable('mentors').execute();
}
