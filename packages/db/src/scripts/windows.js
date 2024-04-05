import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

class FileMigrationProvider {
  #props;
  constructor(props) {
    this.#props = props;
  }
  async getMigrations() {
    const migrations = {};
    const files = await this.#props.fs.readdir(this.#props.migrationFolder);
    for (const fileName of files) {
      const name = this.#props.path.join(this.#props.migrationFolder, fileName);
      console.log({ name });
      const migration = await import(name);
      const migrationKey = fileName.substring(0, fileName.lastIndexOf('.'));
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
