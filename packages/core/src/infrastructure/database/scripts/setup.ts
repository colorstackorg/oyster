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

exec(`psql -U postgres -h localhost -d postgres -f ${pathToInitFile}`,
  (error, stdout, stderr) => {
    if (stdout) {
      console.log(stdout);
    }

    if (stderr) {
      // Log but don't throw for notices/warnings.
      console.warn(stderr);
    }

    if (error) {
      throw new Error(`psql exited with error: ${error}`);
    }
  }
);
