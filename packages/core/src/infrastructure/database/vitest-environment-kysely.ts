import type { Environment as ViteEnvironment } from 'vitest';

import { seedTestDatabase } from '@/shared/utils/test.utils';
import { createDatabaseConnection } from './shared/create-database-connection';
import { migrate } from './shared/migrate';

const environment: ViteEnvironment = {
  name: 'kysely',
  transformMode: 'ssr',

  async setup() {
    const db = createDatabaseConnection();

    async function teardown() {
      await db.schema.dropSchema('public').cascade().execute();
      await db.schema.createSchema('public').execute();
      await db.destroy();
    }

    try {
      await migrate();

      await db.transaction().execute(async (trx) => {
        await seedTestDatabase(trx);
      });
    } catch {
      await teardown();
    }

    return {
      teardown,
    };
  },
};

export default environment;
