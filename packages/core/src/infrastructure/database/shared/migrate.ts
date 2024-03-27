import { promises as fs } from 'fs';
import { FileMigrationProvider, Migrator } from 'kysely';
import path from 'path';
import { fileURLToPath } from 'url';

import { createDatabaseConnection } from './create-database-connection';

/**
 * Migrates the database to the latest version by executing all migrations.
 *
 * This is in the `/shared` folder because it is needed not only for the
 * `db:migrate` script (self-explanatory), but also for the `db:seed` script. We
 * need it for seeding because we first completely clean the database, and then
 * we want to ensure that the database is migrated to the latest version before
 * we seed it.
 */
export async function migrate(down: boolean = false) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const db = createDatabaseConnection();

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

  const { error, results } = !!down
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

  await db.destroy();
}
