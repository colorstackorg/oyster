import { Transaction, sql } from 'kysely';

import { db } from '@/infrastructure/database';

import { DB } from 'kysely-codegen/dist/db';
import { TEST_COMPANY_1, TEST_COMPANY_2, TEST_COMPANY_3 } from './constants';

beforeEach(async () => {
  await db.transaction().execute(async (trx) => {
    await truncate(trx);
    await seed(trx);
  });
});

// Helpers

/**
 * Truncates all tables in the database - wiping all rows, but does not affect
 * the schema itself.
 *
 * @see https://www.postgresql.org/docs/current/sql-truncate.html
 */
async function truncate(trx: Transaction<DB>) {
  const tables = await db.introspection.getTables();

  const names = tables
    .filter((table) => {
      // We don't want to wipe the kysely tables, which track migrations b/c
      // migrations should only be run once.
      return !table.name.includes('kysely_');
    })
    .map((table) => {
      return table.name;
    })
    .join(', ');

  await sql`truncate table ${sql.raw(names)} cascade;`.execute(trx);
}

async function seed(trx: Transaction<DB>) {
  await trx
    .insertInto('companies')
    .values([TEST_COMPANY_1, TEST_COMPANY_2, TEST_COMPANY_3])
    .execute();
}
