import { program } from 'commander';

import { migrate } from '../shared/migrate';

const DOWN_FLAG = '--down';

// Allow the program to use the "--down" flag.
program.option(DOWN_FLAG, 'Rollback the last migration.');

// Parse the command line arguments.
program.parse();

// Read the value of the "--down" flag.
const { down } = program.opts();

migrate({ down: !!down });
