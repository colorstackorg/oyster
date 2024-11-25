import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

import { DATABASE_URL } from '../shared/env';
import { type DB } from '../shared/types';

export function createDatabaseConnection(url: string = DATABASE_URL) {
  if (!url) {
    throw new Error(
      '"DATABASE_URL" must be set to establish a connection to the database.'
    );
  }

  const dialect = new PostgresDialect({
    pool: new pg.Pool({
      connectionString: url,
    }),
  });

  const db = new Kysely<DB>({
    dialect,
    plugins: [new CamelCasePlugin()],
  });

  return db;
}
