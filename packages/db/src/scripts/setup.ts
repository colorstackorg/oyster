import { exec } from 'child_process';

import { IS_PRODUCTION } from '../shared/env';

if (IS_PRODUCTION) {
  throw new Error('Cannot setup database in non-development environment.');
}

const commands = [
  'DROP DATABASE IF EXISTS colorstack',
  'DROP DATABASE IF EXISTS colorstack_test',
  'DROP ROLE IF EXISTS colorstack',
  "CREATE ROLE colorstack WITH SUPERUSER LOGIN PASSWORD 'colorstack'",
  'CREATE DATABASE colorstack OWNER colorstack',
  'CREATE DATABASE colorstack_test OWNER colorstack',
]
  .map((command) => `-c "${command}"`)
  .join(' ');

exec(
  // By default, everyone will have the role "postgres" and the database
  // "postgres", so we use that to do our initial connection to the Postgres
  // shell. We also have to specify the host, which satisfies the "peer"
  // authentication requirement (if that is set in pg_hba.conf).
  `psql -U postgres -h localhost -d postgres ${commands}`,
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
