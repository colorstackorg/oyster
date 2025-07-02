import { afterAll, afterEach, beforeAll, beforeEach, jest } from 'bun:test';
import { type Transaction } from 'kysely';

import {
  company1,
  company2,
  company3,
  student1,
  student1Emails,
} from './constants';
import { type DB } from '../shared/types';
import { createDatabaseConnection } from '../use-cases/create-database-connection';
import { migrate } from '../use-cases/migrate';
import { truncate } from '../use-cases/truncate';

const db = createDatabaseConnection();

beforeAll(async () => {
  await migrate({ db });
});

beforeEach(async () => {
  await db.transaction().execute(async (trx) => {
    await truncate(trx);
    await seed(trx);
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await db.destroy();
});

// Helpers

async function seed(trx: Transaction<DB>) {
  await trx
    .insertInto('studentEmails')
    .values([
      ...student1Emails.map(({ email }) => {
        return { email };
      }),
    ])
    .execute();

  await trx.insertInto('students').values([student1]).execute();

  await trx
    .updateTable('studentEmails')
    .set({ studentId: student1.id })
    .where(
      'email',
      'in',
      student1Emails.map(({ email }) => email)
    )
    .execute();

  await trx
    .insertInto('companies')
    .values([company1, company2, company3])
    .execute();
}
