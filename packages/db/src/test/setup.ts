import { Transaction } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';

import { db } from '../shared/db';
import { truncate } from '../use-cases/truncate';
import {
  company1,
  company2,
  company3,
  company4,
  student1,
  student1Emails,
} from './constants';

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
    .values([company1, company2, company3, company4])
    .execute();
}
