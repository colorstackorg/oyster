import { type DB } from 'db:types';
import { type Transaction, sql } from 'kysely';
import readline from 'readline';
import { z } from 'zod';

import { db } from '../shared/db';
import { IS_PRODUCTION } from '../shared/env';
import { migrate } from '../use-cases/migrate';
import { truncate } from '../use-cases/truncate';

if (IS_PRODUCTION) {
  throw new Error('Cannot seed database in non-development environment.');
}

async function main() {
  try {
    await setEmailFromCommandLine();
    console.log('(1/4) Email looks good. ✅');

    await migrate({ db });
    console.log('(2/4) Ran migrations and initialized tables. ✅');

    await db.transaction().execute(async (trx) => {
      await truncate(trx);
      await seed(trx);
    });

    console.log('(3/4) Wiped all data. ✅');
    console.log('(4/4) Seeded the database. ✅');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

let email = '';

async function seed(trx: Transaction<DB>) {
  const schoolId1 = id();
  const schoolId2 = id();

  await trx
    .insertInto('schools')
    .values([
      {
        addressCity: 'Pittsburgh',
        addressState: 'PA',
        addressZip: '15213',
        id: schoolId1,
        name: 'Carnegie Mellon University',
      },
      {
        addressCity: 'Ithaca',
        addressState: 'NY',
        addressZip: '14850',
        id: schoolId2,
        name: 'Cornell University',
      },
      {
        addressCity: 'Washington',
        addressState: 'D.C.',
        addressZip: '20059',
        id: id(),
        name: 'Howard University',
      },
      {
        addressCity: 'Kennesaw',
        addressState: 'GA',
        addressZip: '30144',
        id: id(),
        name: 'Kennesaw State University',
      },
      {
        addressCity: 'Berkeley',
        addressState: 'CA',
        addressZip: '94720',
        id: id(),
        name: 'University of California, Berkeley',
      },
    ])
    .execute();

  await trx
    .insertInto('admins')
    .values([
      {
        email,
        id: id(),
        isAmbassador: false,
        firstName: 'First',
        lastName: 'Last',
      },
    ])
    .execute();

  await trx.insertInto('studentEmails').values([{ email }]).execute();

  const memberId = id();

  await trx
    .insertInto('students')
    .values([
      {
        acceptedAt: new Date(),
        currentLocation: 'New York, NY',
        currentLocationCoordinates: sql`point(-73.935242, 40.73061)`,
        educationLevel: 'undergraduate',
        email,
        firstName: 'First',
        gender: '',
        graduationYear: new Date().getFullYear().toString(),
        id: memberId,
        lastName: 'Last',
        major: 'computer_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId1,
      },
    ])
    .execute();

  await trx
    .updateTable('studentEmails')
    .set({ studentId: memberId })
    .where('email', '=', email)
    .execute();
}

async function setEmailFromCommandLine() {
  const answer = await question(
    'In order to log into the Member Profile and Admin Dashboard, you will need both a member record and an admin record. Please provide an email so we can create those for you.\n' +
      'Email: '
  );

  const result = z
    .string()
    .trim()
    .min(1)
    .email()
    .transform((value) => {
      return value.toLowerCase();
    })
    .safeParse(answer);

  if (!result.success) {
    throw new Error('The email you provided was invalid.');
  }

  email = result.data;
}

async function question(prompt: string) {
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    cli.question(prompt, (input) => {
      resolve(input);
      cli.close();
    });
  });
}

let counter = 0;

function id() {
  counter++;

  return counter.toString();
}

main();
