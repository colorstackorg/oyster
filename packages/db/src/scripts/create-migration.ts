import dedent from 'dedent';
import { writeFileSync } from 'fs';
import path from 'path';
import prompt from 'prompt-sync';
import { fileURLToPath } from 'url';

import { iife } from '@oyster/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copied this beautiful piece of code from knex's codebase, see here:
// https://github.com/knex/knex/blob/master/lib/migrations/util/timestamp.js
const timestamp = iife(() => {
  const now = new Date();

  return (
    now.getUTCFullYear().toString() +
    (now.getUTCMonth() + 1).toString().padStart(2, '0') +
    now.getUTCDate().toString().padStart(2, '0') +
    now.getUTCHours().toString().padStart(2, '0') +
    now.getUTCMinutes().toString().padStart(2, '0') +
    now.getUTCSeconds().toString().padStart(2, '0')
  );
});

const response = prompt()('Enter a migration name: ');
const name = response.toLowerCase().trim();

writeFileSync(
  path.join(__dirname, `../migrations/${timestamp}_${name}.ts`),
  dedent`
    import { Kysely } from 'kysely';

    export async function up(db: Kysely<any>) {}
    
    export async function down(db: Kysely<any>) {}\n
  `
);
