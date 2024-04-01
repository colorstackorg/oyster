import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { ENV } from '@/shared/env';

if (ENV.ENVIRONMENT !== 'development') {
  throw new Error('Cannot setup database in non-development environment.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This is the full path to the `setup.sql` file.
const pathToInitFile = path.join(__dirname, 'setup.sql');

const dbUser = 'postgres';
const dbName = 'postgres';

const psqlCommand = `psql -U ${dbUser} -d ${dbName} -f ${pathToInitFile}`;

exec(psqlCommand, (error, stdout, stderr) => {
  console.log(stdout); // Log standard output
  if (stderr) {
    console.warn(stderr); // Log but don't throw for notices/warnings
  }
  if (error) {
    // Check for actual error
    console.error(`exec error: ${error}`);
    throw new Error(`psql exited with error: ${error}`);
  }
});
