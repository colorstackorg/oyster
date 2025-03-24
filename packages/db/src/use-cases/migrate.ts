import { promises as fs } from 'fs';
import { FileMigrationProvider, type Kysely, Migrator } from 'kysely';
import path from 'pathe';
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

  const filename = fileURLToPath(import.meta.url);
  const dirname = path.dirname(filename);

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(dirname, '../migrations'),
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
