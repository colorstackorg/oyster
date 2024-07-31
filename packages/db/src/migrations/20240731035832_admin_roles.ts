import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema.alterTable('admins').addColumn('role', 'text').execute();

  await db
    .updateTable('admins')
    .set((eb) => {
      return {
        role: eb
          .case()
          .when('is_ambassador', '=', true)
          .then({ role: 'ambassador' })
          .else({ role: 'admin' }),
      };
    })
    .execute();

  await db.schema
    .alterTable('admins')
    .alterColumn('role', (column) => {
      return column.setNotNull();
    })
    .dropColumn('is_ambassador')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('admins')
    .addColumn('is_ambassador', 'boolean')
    .execute();

  await db
    .updateTable('admins')
    .set((eb) => {
      return {
        is_ambassador: eb('role', '=', 'ambassador'),
      };
    })
    .execute();

  await db.schema
    .alterTable('admins')
    .alterColumn('is_ambassador', (column) => {
      return column.setNotNull();
    })
    .dropColumn('role')
    .execute();
}
