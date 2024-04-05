import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import prompt from 'prompt-sync';
import { fileURLToPath } from 'url';

function setupEnvironmentFiles() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const monorepoRoot = path.join(__dirname, '../../..');

  const exampleFiles = [
    path.join(monorepoRoot, 'apps/admin-dashboard/.env.example'),
    path.join(monorepoRoot, 'apps/api/.env.example'),
    path.join(monorepoRoot, 'apps/member-profile/.env.example'),
    path.join(monorepoRoot, 'packages/core/.env.test.example'),
    path.join(monorepoRoot, 'packages/db/.env.example'),
  ];

  exampleFiles.forEach((file) => {
    const newFile = file.replace('.example', '');
    fs.copyFileSync(file, newFile);
    console.log(`Created ${chalk.green(newFile)}.`);
  });
}

function getPermissionToOverwrite() {
  console.warn(
    chalk.yellow('Any existing ".env" files you have will be overwritten.'),
    chalk.yellow(
      'If you had any variables enabled that were not in the ".env.example" files, you should write them somewhere and re-add them after this script finishes.\n'
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
