import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';
import pg from 'pg';

export function createDatabaseConnection() {
  const DATABASE_URL = process.env.DATABASE_URL;

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
