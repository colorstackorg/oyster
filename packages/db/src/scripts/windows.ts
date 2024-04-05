import { iife } from '@oyster/utils';
import { promises as fs } from 'fs';
import { FileMigrationProvider } from 'kysely';
import path from 'path';

iife(async () => {
  const migrationFolder = path.join(import.meta.url, '../../migrations');

  const migrations = await new FileMigrationProvider({
    fs,
    migrationFolder,
    path,
  }).getMigrations();

  console.log(migrations.length);
});
