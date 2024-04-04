import { promises as fs } from 'fs';
import { FileMigrationProvider, Kysely, Migrator } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';
import path from 'path';
import { fileURLToPath } from 'url';

import { createDatabaseConnection } from './create-database-connection';

type MigrateOptions = {
  db?: Kysely<DB>;
  down?: boolean;
};

const defaultOptions: MigrateOptions = {
  db: undefined,
  down: false,
};

/**
 * Migrates the database to the latest version by executing all migrations.
 *
 * This is in the `/shared` folder because it is needed not only for the
 * `db:migrate` script (self-explanatory), but also for the `db:seed` script. We
 * need it for seeding because we first completely clean the database, and then
 * we want to ensure that the database is migrated to the latest version before
 * we seed it.
 */
export async function migrate(options: MigrateOptions = defaultOptions) {
  options = {
    ...defaultOptions,
    ...options,
  };

  const db = options.db || createDatabaseConnection();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
    migrationTableName: 'kysely_migrations',
    migrationLockTableName: 'kysely_migrations_lock',
  });

  const { error, results } = options.down
    ? await migrator.migrateDown()
    : await migrator.migrateToLatest();

  if (results) {
    results.forEach((result) => {
      const prefix = `[${result.direction}] "${result.migrationName}"`;

      if (result.status === 'Success') {
        console.log(`${prefix}: Migration was executed successfully.`);
        return;
      }

      if (result.status === 'Error') {
        console.error(`${prefix}: Failed to execute migration.`);
        return;
      }
    });
  }

  if (error) {
    console.error('An error occurred with the Kysely migrator.', error);
    process.exit(1);
  }

  // If a database instance was passed in, we'll yield the responsibility of
  // destroying it to the caller. Otherwise, we'll destroy it here.
  if (!options.db) {
    await db.destroy();
  }
}
