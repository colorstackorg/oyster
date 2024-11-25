import { promises as fs } from 'fs';
import {
  type Kysely,
  type Migration,
  type MigrationProvider,
  Migrator,
} from 'kysely';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { createDatabaseConnection } from './create-database-connection';
import { type DB } from '../shared/types';

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

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider(),
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
    console.error(
      'Something went wrong! To debug, see common migration errors here:',
      'https://github.com/colorstackorg/oyster/blob/main/docs/how-to-implement-a-database-migration.md#common-errors.',
      error
    );

    process.exit(1);
  }

  // If a database instance was passed in, we'll yield the responsibility of
  // destroying it to the caller. Otherwise, we'll destroy it here.
  if (!options.db) {
    await db.destroy();
  }
}

// NOTE: Kysely's built-in `FileMigrationProvider` does not work on Windows,
// due to Windows not supporting `import()` of absolute URLs which are not
// file URLs. Kysely has decided not to fix this issue since they don't want
// to have any platform-specific code in their library, so we have to fix it
// ourselves. You can reference the original implementation here:
// https://github.com/kysely-org/kysely/blob/0.27.2/src/migration/file-migration-provider.ts

class FileMigrationProvider implements MigrationProvider {
  async getMigrations() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // This is the absolute path to the "migrations" directory.
    const directoryPath = path.join(__dirname, '../migrations');

    // This is a list of file names in the "migrations" directory.
    const files = await fs.readdir(directoryPath);

    const migrations: Record<string, Migration> = {};

    for (const file of files) {
      const pathParts = [directoryPath, file];

      // This is the main addition we're making to the original code from
      // Kysely. On Windows, we need all absolute URLs to be "file URLs", so
      // we add this prefix.
      if (os.platform() === 'win32') {
        pathParts.unshift('file://');
      }

      const absolutePathToMigration = path.join(...pathParts);

      const migration = await import(absolutePathToMigration);

      // We remove the extension form the file name to get the migration key.
      const migrationKey = file.substring(0, file.lastIndexOf('.'));

      migrations[migrationKey] = migration;
    }

    return migrations;
  }
}
