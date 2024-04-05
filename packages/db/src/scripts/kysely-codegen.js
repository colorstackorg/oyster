// Note: This is janky, and should only exist temporarily.

// When setting up the project for the very first time, the environment
// variables won't be set up yet. However, there is a "postinstall" script that
// runs after the packages are installed, which relies on the "DATABASE_URL"
// environment variable being set (kysely-codgen). This script is responsible
// for skipping kysely-codegen if that "DATABASE_URL" isn't set, which again,
// will be the case when setting up the project for the first time.

import { exec } from 'child_process';
import { config } from 'dotenv';

const env = config().parsed;

if (env && env.DATABASE_URL) {
  exec(
    'kysely-codegen --dialect=postgres --camel-case',
    (error, stdout, stderr) => {
      if (stdout) {
        console.log(stdout);
      }

      if (stderr) {
        console.warn(stderr);
      }

      if (error) {
        throw new Error(error);
      }
    }
  );
} else {
  console.warn('Skipping kysely-codegen...');
}
