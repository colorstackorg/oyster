import { Insertable, Transaction } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';

// Constants

export const TEST_COMPANY_1: Insertable<DB['companies']> = {
  crunchbaseId: '11',
  id: '1',
  name: 'Adobe',
};

export const TEST_COMPANY_2: Insertable<DB['companies']> = {
  crunchbaseId: '22',
  id: '2',
  name: 'Google',
};

export const TEST_COMPANY_3: Insertable<DB['companies']> = {
  crunchbaseId: '33',
  id: '3',
  name: 'Microsoft',
};

export const TEST_COMPANY_4: Insertable<DB['companies']> = {
  crunchbaseId: '44',
  description: '...',
  domain: 'stripe.com',
  id: '44',
  imageUrl: '...',
  name: 'Stripe',
  stockSymbol: '...',
};

// Helpers

export async function seedTestDatabase(trx: Transaction<DB>) {
  await trx
    .insertInto('companies')
    .values([TEST_COMPANY_1, TEST_COMPANY_2, TEST_COMPANY_3])
    .execute();
}
