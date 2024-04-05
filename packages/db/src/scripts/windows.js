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
    console.log('1', this.#props.migrationFolder);
    const files = await this.#props.fs.readdir(this.#props.migrationFolder);
    console.log('2');
    for (const fileName of files) {
      const name = this.#props.path.join(this.#props.migrationFolder, fileName);
      const migration = await import(name);
      const migrationKey = fileName.substring(0, fileName.lastIndexOf('.'));
    }
    return migrations;
  }
}

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const migrationFolder = 'file://' + path.join(__dirname, '../migrations');
  console.log('0', migrationFolder);

  const migrations = await new FileMigrationProvider({
    fs,
    migrationFolder,
    path,
  }).getMigrations();

  console.log(migrations.length);
})();
