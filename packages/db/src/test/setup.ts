import { type DB } from 'db:types';
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
import { truncate } from '../use-cases/truncate';

beforeEach(async () => {
  await db.transaction().execute(async (trx) => {
    await truncate(trx);
    await seed(trx);
  });
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
