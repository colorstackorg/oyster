import { db } from '@/infrastructure/database';
import {
  TEST_COMPANY_1,
  TEST_COMPANY_4,
} from '@/infrastructure/database/test/constants';
import * as module from '../queries/get-crunchbase-organization';
import { saveCompanyIfNecessary } from './save-company-if-necessary';

describe(saveCompanyIfNecessary.name, () => {
  test('If the `crunchbaseId` is empty, should return null', async () => {
    const result = await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, '');
    });

    expect(result).toBe(null);
  });

  test('If the company already exists, should return the existing company ID.', async () => {
    const result = await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, TEST_COMPANY_1.crunchbaseId);
    });

    expect(result).toBe(TEST_COMPANY_1.id);
  });

  test('If the company does not exist in our database, should call the Crunchbase API.', async () => {
    const mock = vi
      .spyOn(module, 'getCrunchbaseOrganization')
      .mockResolvedValue({
        crunchbaseId: TEST_COMPANY_4.crunchbaseId,
        description: TEST_COMPANY_4.description!,
        domain: TEST_COMPANY_4.domain!,
        imageUrl: TEST_COMPANY_4.imageUrl!,
        name: TEST_COMPANY_4.name,
        stockSymbol: TEST_COMPANY_4.stockSymbol!,
      });

    const result = await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, TEST_COMPANY_4.crunchbaseId);
    });

    expect(mock).toHaveBeenCalledWith(TEST_COMPANY_4.crunchbaseId);
  });

  test('If the company does not exist in our database, it should create it from the Crunchbase API result.', async () => {
    const mock = vi
      .spyOn(module, 'getCrunchbaseOrganization')
      .mockResolvedValue({
        crunchbaseId: TEST_COMPANY_4.crunchbaseId,
        description: TEST_COMPANY_4.description!,
        domain: TEST_COMPANY_4.domain!,
        imageUrl: TEST_COMPANY_4.imageUrl!,
        name: TEST_COMPANY_4.name,
        stockSymbol: TEST_COMPANY_4.stockSymbol!,
      });

    const result = await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, TEST_COMPANY_4.crunchbaseId);
    });

    const company = await db
      .selectFrom('companies')
      .select(['id'])
      .where('crunchbaseId', '=', TEST_COMPANY_4.crunchbaseId)
      .executeTakeFirst();

    expect(company).toBeTruthy();
    expect(result).toBe(company!.id);
  });
});
