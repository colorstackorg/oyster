import { sql } from 'kysely';
import readline from 'readline';

import { EducationLevel, Email, Major } from '@colorstack/types';
import { id } from '@colorstack/utils';

import { ENV } from '@/shared/env';
import { createDatabaseConnection } from '../shared/create-database-connection';
import { migrate } from '../shared/migrate';

if (ENV.ENVIRONMENT !== 'development') {
  throw new Error('Cannot seed database in non-development environment.');
}

const db = createDatabaseConnection();

let email = '';

async function main() {
  try {
    await setEmailFromCommandLine();
    console.log('(1/4) Email looks good. ✅');

    await clean();
    console.log('(2/4) Dropped and recreated the public schema. ✅');

    await migrate();
    console.log('(3/4) Ran migrations and initialized tables. ✅');

    await seed();
    console.log('(4/4) Seeded the database. ✅');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

async function clean() {
  await db.transaction().execute(async (trx) => {
    await trx.schema.dropSchema('public').cascade().execute();
    await trx.schema.createSchema('public').execute();
  });
}

async function seed() {
  await db.transaction().execute(async (trx) => {
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
          educationLevel: EducationLevel.UNDERGRADUATE,
          email,
          firstName: 'First',
          gender: '',
          graduationYear: new Date().getFullYear().toString(),
          id: memberId,
          lastName: 'Last',
          major: Major.COMPUTER_SCIENCE,
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
  });
}

async function setEmailFromCommandLine() {
  const answer = await question(
    'In order to log into the Member Profile and Admin Dashboard, you will need both a member record and an admin record. Please provide an email so we can create those for you.\n' +
      'Email: '
  );

  const result = Email.safeParse(answer);

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

main();
