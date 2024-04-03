import { Transaction } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';

import { db } from '..';
import { truncate } from '../shared/truncate';
import { TEST_COMPANY_1, TEST_COMPANY_2, TEST_COMPANY_3 } from './constants';

beforeEach(async () => {
  await db.transaction().execute(async (trx) => {
    await truncate(trx);
    await seed(trx);
  });
});

// Helpers

async function seed(trx: Transaction<DB>) {
  await trx
    .insertInto('companies')
    .values([TEST_COMPANY_1, TEST_COMPANY_2, TEST_COMPANY_3])
    .execute();
}
