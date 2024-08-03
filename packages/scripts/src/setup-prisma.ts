import chalk from 'chalk';
import dedent from 'dedent';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

try {
  const __filename = fileURLToPath(import.meta.url);
  const monorepoRoot = path.join(__filename, '../../../..');
  const pathname = path.join(monorepoRoot, 'packages/db/schema.prisma');

  const content = dedent`
    generator client {
      provider = "prisma-client-js"
    }

    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }\n
  `;

  writeFileSync(pathname, content);

  console.log(chalk.green('Prisma schema has been initialized! 🎉'));
  console.log(chalk.green(pathname));
} catch (error) {
  console.error(chalk.red('Something went wrong! 😢'));
  console.error(error);
}
