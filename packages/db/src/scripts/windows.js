import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

class FileMigrationProvider {
  constructor(props) {
    this.props = props;
  }

  async getMigrations() {
    const migrations = {};
    console.log('1', this.props.migrationFolder);
    const files = await this.props.fs.readdir(this.props.migrationFolder);
    console.log('2');
    for (const fileName of files) {
      const name = this.props.path.join(
        'file://',
        this.props.migrationFolder,
        fileName
      );
      console.log('3', name);
      const migration = await import(name);
      const migrationKey = fileName.substring(0, fileName.lastIndexOf('.'));
    }
    return migrations;
  }
}

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  console.log('resolve', path.resolve(__dirname, '../migrations'));
  console.log('join', path.join(__dirname, '../migrations'));

  const migrations = await new FileMigrationProvider({
    fs,
    migrationFolder: path.resolve(__dirname, '../migrations'),
    path,
  }).getMigrations();

  console.log(migrations);
})();
