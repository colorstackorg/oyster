import { describe, test, expect, spyOn } from 'bun:test';

import { company1, company4 } from '@oyster/db/test/constants';

import { db } from '@/infrastructure/database';
import { saveCompanyIfNecessary } from './save-company-if-necessary';
import * as module from '../queries/get-crunchbase-organization';

describe(saveCompanyIfNecessary.name, () => {
  test('If the `crunchbaseId` is empty, should return null', async () => {
    const result = await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, '');
    });

    expect(result).toBe(null);
  });

  test('If the company already exists, should return the existing company ID.', async () => {
    const result = await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, company1.crunchbaseId);
    });

    expect(result).toBe(company1.id);
  });

  test('If the company does not exist in our database, should call the Crunchbase API.', async () => {
    const mock = spyOn(module, 'getCrunchbaseOrganization').mockResolvedValue({
      crunchbaseId: company4.crunchbaseId,
      description: company4.description!,
      domain: company4.domain!,
      imageUrl: company4.imageUrl!,
      name: company4.name,
      stockSymbol: company4.stockSymbol!,
    });

    await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, company4.crunchbaseId);
    });

    expect(mock).toHaveBeenCalledWith(company4.crunchbaseId);
  });

  test('If the company does not exist in our database, it should create it from the Crunchbase API result.', async () => {
    spyOn(module, 'getCrunchbaseOrganization').mockResolvedValue({
      crunchbaseId: company4.crunchbaseId,
      description: company4.description!,
      domain: company4.domain!,
      imageUrl: company4.imageUrl!,
      name: company4.name,
      stockSymbol: company4.stockSymbol!,
    });

    const result = await db.transaction().execute(async (trx) => {
      return saveCompanyIfNecessary(trx, company4.crunchbaseId);
    });

    const company = await db
      .selectFrom('companies')
      .select(['id'])
      .where('crunchbaseId', '=', company4.crunchbaseId)
      .executeTakeFirst();

    expect(company).toBeTruthy();
    expect(result).toBe(company!.id);
  });
});
