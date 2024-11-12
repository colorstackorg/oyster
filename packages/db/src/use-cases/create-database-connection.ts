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

  // In Railway (production), the `DATABASE_URL` is an internal URL that is
  // part of a private network. However in the build phase, that private
  // network is not available, so we need to use the public URL instead (simply)
  // to generate the database types and run the migrations. The public URL is
  // available via `DATABASE_PUBLIC_URL` in the build environment variables.
  const connectionString =
    process.env.IS_RAILWAY_BUILD === 'true'
      ? process.env.DATABASE_PUBLIC_URL
      : url;

  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString }),
  });

  const db = new Kysely<DB>({
    dialect,
    plugins: [new CamelCasePlugin()],
  });

  return db;
}
