import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { type DB } from 'kysely-codegen/dist/db';
import pg from 'pg';

import { DATABASE_URL } from '../shared/env';

export function createDatabaseConnection() {
  if (!DATABASE_URL) {
    throw new Error(
      '"DATABASE_URL" must be set to establish a connection to the database.'
    );
  }

  const dialect = new PostgresDialect({
    pool: new pg.Pool({
      connectionString: DATABASE_URL,
    }),
  });

  const db = new Kysely<DB>({
    dialect,
    plugins: [new CamelCasePlugin()],
  });

  return db;
}
