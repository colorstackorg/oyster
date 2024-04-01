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

exec(`psql -f ${pathToInitFile}`, (_, stdout, stderror) => {
  if (stderror) {
    throw new Error(stderror);
  }
});
