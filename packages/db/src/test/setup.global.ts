import { afterAll, beforeAll, beforeEach } from 'bun:test';
import { type Transaction } from 'kysely';

import {
  company1,
  company2,
  company3,
  student1,
  student1Emails,
} from './constants';
import { db } from '../shared/db';
import { type DB } from '../shared/types';
import { migrate } from '../use-cases/migrate';
import { truncate } from '../use-cases/truncate';

beforeAll(async () => {
  await migrate({ db });
});

beforeEach(async () => {
  await db.transaction().execute(async (trx) => {
    await truncate(trx);
    await seed(trx);
  });
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
