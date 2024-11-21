import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('full_time_job_offers')
    .addColumn('total_compensation', 'decimal(10, 2)', (column) => {
      return column.notNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('full_time_job_offers')
    .dropColumn('total_compensation')
    .execute();
}
