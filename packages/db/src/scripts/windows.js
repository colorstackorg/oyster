import { promises as fs } from 'fs';
import path from 'path';

class FileMigrationProvider {
  #props;
  constructor(props) {
    this.#props = props;
  }
  async getMigrations() {
    const migrations = {};
    const files = await this.#props.fs.readdir(this.#props.migrationFolder);
    for (const fileName of files) {
      if (
        fileName.endsWith('.js') ||
        (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) ||
        fileName.endsWith('.mjs') ||
        (fileName.endsWith('.mts') && !fileName.endsWith('.d.mts'))
      ) {
        const migration = await import(
          /* webpackIgnore: true */ this.#props.path.join(
            this.#props.migrationFolder,
            fileName
          )
        );
        const migrationKey = fileName.substring(0, fileName.lastIndexOf('.'));
      }
    }
    return migrations;
  }
}

(async () => {
  const migrationFolder = path.join(import.meta.url, '../../migrations');

  const migrations = await new FileMigrationProvider({
    fs,
    migrationFolder,
    path,
  }).getMigrations();

  console.log(migrations.length);
})();
