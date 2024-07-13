import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import prompt from 'prompt-sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const monorepoRoot = path.join(__filename, '../../../..');

const exampleFiles = [
  path.join(monorepoRoot, 'apps/admin-dashboard/.env.example'),
  path.join(monorepoRoot, 'apps/api/.env.example'),
  path.join(monorepoRoot, 'apps/member-profile/.env.example'),
  path.join(monorepoRoot, 'packages/core/.env.test.example'),
  path.join(monorepoRoot, 'packages/db/.env.example'),
  path.join(monorepoRoot, 'prisma/.env.example'),
];

function setupEnvironmentFiles() {
  exampleFiles.forEach((file) => {
    fs.copyFileSync(file, file.replace('.example', ''));
  });
}

function getPermissionToOverwrite(): boolean {
  const envFiles = exampleFiles
    .filter((file) => {
      return fs.existsSync(file.replace('.example', ''));
    })
    .map((file) => {
      return file.replace('.example', '');
    });

  if (!envFiles.length) {
    return true;
  }

  console.warn(
    chalk.yellow('The following ".env" files you have will be overwritten.\n')
  );

  envFiles.forEach((file) => {
    console.warn(chalk.yellow(`- ${file}`));
  });

  console.warn(
    chalk.yellow(
      '\nIf you had any variables enabled that were not in their corresponding ".env.example" (ie: email setup) files, you should jot those variables down somewhere and re-add them after this script finishes.\n'
    )
  );

  const response = prompt()(`Please enter ${chalk.green('"y"')} to continue: `);

  const permission = response === 'y';

  return permission;
}

try {
  const permission = getPermissionToOverwrite();

  if (permission) {
    setupEnvironmentFiles();
    console.log('Environment files have been set up! 🎉');
  } else {
    console.log('Aborting setup. No files were overwritten.');
  }
} catch (error) {
  console.error('Something went wrong! 😢');
  console.error(error);
}
